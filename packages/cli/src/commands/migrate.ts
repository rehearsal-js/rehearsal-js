#!/usr/bin/env node

// TODO: handle ctrl + c

import { resolve } from 'path';
import { migrate } from '@rehearsal/migrate';
import {
  discoverEmberPackages,
  getMigrationStrategy,
  SourceFile,
} from '@rehearsal/migration-graph';
import { jsonFormatter, mdFormatter, Reporter, sarifFormatter } from '@rehearsal/reporter';
import { Command } from 'commander';
import { existsSync, readJSONSync } from 'fs-extra';
import { Listr } from 'listr2';
import { createLogger, format, transports } from 'winston';
import { debug } from 'debug';

import execa = require('execa');

import { generateReports } from '../helpers/report';
import { MigrateCommandContext, MigrateCommandOptions, PackageSelection, MenuMap } from '../types';
import { UserConfig } from '../userConfig';
import {
  addDep,
  determineProjectName,
  parseCommaSeparatedList,
  runModuleCommand,
  writeTSConfig,
  isTypescriptInDevdep,
  getPathToBinary,
  isEmber,
} from '../utils';
import { State } from '../helpers/state';

const IN_PROGRESS_MARK = '🚧';
const COMPLETION_MARK = '✅';
const DEBUG_CALLBACK = debug('rehearsal:migrate');

export const migrateCommand = new Command();

process.on('SIGINT', () => {
  console.log('Received SIGINT. Press Control-D to exit.');
});

migrateCommand
  .name('migrate')
  .description('Migrate Javascript project to Typescript')
  .option('-p, --basePath <project base path>', 'Base dir path of your project.', process.cwd())
  .option('-e, --entrypoint <entrypoint>', 'entrypoint js file for your project')
  .option(
    '-r, --report <reportTypes>',
    'Report types separated by comma, e.g. -r json,sarif,md',
    parseCommaSeparatedList,
    []
  )
  .option('-o, --outputPath <outputPath>', 'Reports output path', '.rehearsal')
  .option(
    '-u, --userConfig <custom json config for migrate command>',
    'File path for custom config'
  )
  .option('-i, --interactive', 'Interactive mode to help migrate part of large apps')
  .option('-v, --verbose', 'Print more logs to debug.')
  .action(async (options: MigrateCommandOptions) => {
    const loggerLevel = options.verbose ? 'debug' : 'info';
    const logger = createLogger({
      transports: [new transports.Console({ format: format.cli(), level: loggerLevel })],
    });

    const tasks = new Listr<MigrateCommandContext>(
      [
        {
          title: 'Initialization',
          task: async (_ctx, task) => {
            // get custom config
            const userConfig = options.userConfig
              ? new UserConfig(options.basePath, options.userConfig, 'migrate')
              : undefined;

            _ctx.userConfig = userConfig;

            const projectName = determineProjectName(options.basePath);
            const packages = discoverEmberPackages(options.basePath);
            DEBUG_CALLBACK('projectName', projectName);

            if (options.interactive) {
              // Init state and store
              const state = new State(
                projectName,
                packages.map((p) => p.path)
              );
              _ctx.state = state;

              const packageSelections: PackageSelection[] = packages.map((p) => {
                return {
                  name: p.packageName,
                  path: p.path,
                };
              });

              // Get the menu text for each package during interactive mode to show:
              // 1. package has not started any migration before -> no progress found
              // 2. package had a migration with remaining JS files -> x/x migrated, x rehearsal todos
              // 3. package had a full migration with rehearsal todos -> all migrated, x rehearsal todos
              // 4. fully migrated with no JS and rehearsal todo -> do not show the option
              const menuList = packageSelections.map((p) => {
                const { migratedFileCount, totalFileCount, isCompleted } =
                  _ctx.state.getPackageMigrateProgress(
                    p.path // pacakge fullpath is the key of the packageMap in state
                  );
                const errorCount = _ctx.state.getPackageErrorCount(p.path);
                // default text to show per package
                let progressText = `no progress found`;
                let icon = '';
                let isOptionDisabled = false;
                if (totalFileCount !== 0) {
                  // has previous migratoin
                  progressText = `${migratedFileCount} of ${totalFileCount} files migrated, ${errorCount} @ts-ignore(s) need to be fixed`;
                  icon = IN_PROGRESS_MARK;

                  if (isCompleted && errorCount === 0) {
                    icon = COMPLETION_MARK;
                    progressText = `Fully migrated`;
                    isOptionDisabled = true;
                  }
                }
                return {
                  name: `${p.name}(${progressText}) ${icon}`,
                  message: `${p.name}(${progressText}) ${icon}`,
                  value: p.path,
                  disabled: isOptionDisabled,
                };
              });

              // use a map (option display name -> package location pair) to solve an enquirer bug
              // https://github.com/enquirer/enquirer/issues/121
              const menuMap = menuList.reduce((map, current) => {
                map[current.name] = current.value;
                return map;
              }, {} as MenuMap);

              _ctx.input = await task.prompt([
                {
                  type: 'Select',
                  name: 'packageSelection',
                  message:
                    'We have found multiple packages in your project, select the one to migrate:',
                  choices: menuList,
                },
              ]);
              // update basePath based on the selection
              _ctx.targetPackagePath = menuMap[_ctx.input as string];
              task.title = `Initialization Completed! Running migration on ${_ctx.targetPackagePath}.`;
            } else {
              _ctx.targetPackagePath = options.basePath;
              task.title = `Initialization Completed! Running migration on ${projectName}.`;
            }

            // construct migration strategy and prepare all the files needs to be migrated
            const strategy = getMigrationStrategy(_ctx.targetPackagePath, {
              entrypoint: options.entrypoint,
              filterByPackageName: [],
            });
            const files: SourceFile[] = strategy.getMigrationOrder();
            DEBUG_CALLBACK('migrationOrder', files);

            _ctx.strategy = strategy;
            _ctx.sourceFilesWithAbsolutePath = files.map((f) => f.path);
            _ctx.sourceFilesWithRelativePath = files.map((f) => f.relativePath);
          },
        },
        {
          title: 'Installing dependencies',
          enabled: (ctx): boolean => !ctx.skip,
          task: async (_ctx, task) => {
            const packageJson = readJSONSync(resolve(options.basePath, 'package.json'));
            // install custom dependencies
            if (_ctx.userConfig?.hasDependencies) {
              task.title = `Installing custom dependencies`;
              await _ctx.userConfig.install();
            }

            if (isTypescriptInDevdep(options.basePath)) {
              task.skip('typescript already exists. Skipping installing typescript.');
            } else {
              await addDep(['typescript'], true, { cwd: options.basePath });
            }

            // extra dependencies for Ember App/Addon/Engine
            // TODO: dependes on how much extra stuff we need for a specific framework,
            // probably need a plugable system for this.
            if (isEmber(packageJson)) {
              task.title = `Installing dependencies for Ember`;
              await addDep(
                ['@glint/core', '@glint/template', '@glint/environment-ember-loose'],
                true,
                { cwd: options.basePath }
              );
              // assuming ember-cli should be always installed in ember app/addon/engine
              const emberCLIBinPath = await getPathToBinary('ember', { cwd: options.basePath });
              await execa(emberCLIBinPath, ['install', 'ember-cli-typescript@latest'], {
                cwd: options.basePath,
              });
            }
          },
        },
        {
          title: 'Creating tsconfig.json',
          enabled: (ctx): boolean => !ctx.skip,
          task: async (_ctx, task) => {
            if (_ctx.userConfig?.hasTsSetup) {
              task.title = `Creating tsconfig from custom config.`;
              await _ctx.userConfig.tsSetup();
            } else {
              const configPath = resolve(options.basePath, 'tsconfig.json');

              if (existsSync(configPath)) {
                task.skip(`${configPath} already exists, skipping creating tsconfig.json`);
              } else {
                task.title = `Creating tsconfig.`;

                writeTSConfig(options.basePath, _ctx.sourceFilesWithRelativePath);
              }
            }
          },
        },
        {
          title: 'Converting JS files to TS',
          enabled: (ctx): boolean => !ctx.skip,
          task: async (_ctx, task) => {
            const projectName = (await determineProjectName()) || '';
            const reporter = new Reporter(projectName, options.basePath, logger);

            if (_ctx.sourceFilesWithAbsolutePath) {
              const input = {
                basePath: _ctx.targetPackagePath,
                sourceFiles: _ctx.sourceFilesWithAbsolutePath,
                logger: options.verbose ? logger : undefined,
                reporter,
              };

              const { migratedFiles } = await migrate(input);
              if (_ctx.state) {
                _ctx.state.addFilesToPackage(_ctx.targetPackagePath, migratedFiles);
                await _ctx.state.addStateFileToGit();
              }

              const reportOutputPath = resolve(options.basePath, options.outputPath);
              generateReports(reporter, reportOutputPath, options.report, {
                json: jsonFormatter,
                sarif: sarifFormatter,
                md: mdFormatter,
              });
            } else {
              task.skip(
                `Skipping JS -> TS conversion task, since there is no JS file to be converted to TS.`
              );
            }
          },
        },
        {
          title: 'Checking for TypeScript errors',
          enabled: (ctx): boolean => !ctx.skip,
          task: async () => {
            await runModuleCommand(['tsc'], { cwd: options.basePath });
          },
        },
        // TODO: what to do with those ts errors?

        {
          title: 'Creating eslint config',
          enabled: (ctx): boolean => !ctx.skip,
          task: async (_ctx, task) => {
            if (_ctx.userConfig?.hasLintSetup) {
              task.title = `Creating .eslintrc.js from custom config.`;
              await _ctx.userConfig.lintSetup();
            } else {
              task.skip(`Skip creating .eslintrc.js since no custom config is provided.`);
            }
          },
        },
      ],
      { concurrent: false, exitOnError: false }
    );
    try {
      await tasks.run();
    } catch (e) {
      logger.error(`${e}`);
    }
  });
