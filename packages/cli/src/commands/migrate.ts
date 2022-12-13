#!/usr/bin/env node

// TODO: handle ctrl + c

import { resolve } from 'path';
import { migrate } from '@rehearsal/migrate';
import {
  discoverEmberPackages,
  getMigrationStrategy,
  SourceFile,
} from '@rehearsal/migration-graph';
import {
  jsonFormatter,
  mdFormatter,
  Reporter,
  sarifFormatter,
  sonarqubeFormatter,
} from '@rehearsal/reporter';
import { Command } from 'commander';
import { existsSync, writeJSONSync } from 'fs-extra';
import { Listr } from 'listr2';
import { createLogger, format, transports } from 'winston';
import { debug } from 'debug';
import execa = require('execa');
import { version } from '../../package.json';

import { generateReports, getReportSummary } from '../helpers/report';
import {
  MigrateCommandContext,
  MigrateCommandOptions,
  PackageSelection,
  MenuMap,
  TSConfig,
} from '../types';
import { UserConfig } from '../userConfig';
import {
  addDep,
  determineProjectName,
  parseCommaSeparatedList,
  writeTSConfig,
  getPathToBinary,
  readJSON,
  addPackageJsonScripts,
  gitIsRepoDirty,
  resetFiles,
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
    'Report types separated by comma, e.g. -r json,sarif,md,sonarqube',
    parseCommaSeparatedList,
    ['sarif']
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

    console.log(`@rehearsal/migrate ${version.trim()}`);

    const hasUncommittedFiles = await gitIsRepoDirty(options.basePath);
    if (hasUncommittedFiles) {
      logger.warn(
        'You have uncommitted files in your repo. Please commit or stash them as Rehearsal will reset your uncommitted changes.'
      );
      process.exit(0);
    }

    const tasks = new Listr(
      [
        {
          title: 'Initialization',
          task: async (_ctx: MigrateCommandContext, task) => {
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
                  progressText = `${migratedFileCount} of ${totalFileCount} files migrated, ${errorCount} @ts-expect-error(s) need to be fixed`;
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
          title: 'Installing dependencies.',
          enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
          task: async (_ctx: MigrateCommandContext, task) => {
            // install custom dependencies
            if (_ctx.userConfig?.hasDependencies) {
              task.title = `Installing custom dependencies`;
              await _ctx.userConfig.install();
            }
            // even if typescript is installed, exec this and get the latest patch
            await addDep(['typescript'], true, { cwd: options.basePath });
          },
        },
        {
          title: 'Creating tsconfig.json',
          enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
          task: async (_ctx: MigrateCommandContext, task) => {
            if (_ctx.userConfig?.hasTsSetup) {
              task.title = `Creating tsconfig from custom config.`;
              await _ctx.userConfig.tsSetup();
            } else {
              const configPath = resolve(options.basePath, 'tsconfig.json');

              if (existsSync(configPath)) {
                task.title = `${configPath} already exists, ensuring strict mode is enabled.`;

                const tsConfig = readJSON<TSConfig>(configPath) as TSConfig;
                tsConfig.compilerOptions.strict = true;
                writeJSONSync(configPath, tsConfig, { spaces: 2 });
              } else {
                task.title = `Creating tsconfig.`;

                writeTSConfig(options.basePath, _ctx.sourceFilesWithRelativePath);
              }
            }
          },
        },
        {
          title: 'Converting JS files to TS',
          enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
          task: async (_ctx: MigrateCommandContext, task) => {
            const projectName = determineProjectName() || '';
            const { basePath } = options;
            const tscPath = await getPathToBinary('tsc');
            const { stdout } = await execa(tscPath, ['--version']);
            const tsVersion = stdout.split(' ')[1];

            const reporter = new Reporter(
              { tsVersion, projectName, basePath, commandName: '@rehearsal/migrate' },
              logger
            );

            if (_ctx.sourceFilesWithAbsolutePath) {
              const input = {
                basePath: _ctx.targetPackagePath,
                sourceFiles: _ctx.sourceFilesWithAbsolutePath,
                logger: logger,
                reporter,
              };

              const { migratedFiles } = await migrate(input);
              DEBUG_CALLBACK('migratedFiles', migratedFiles);
              if (_ctx.state) {
                _ctx.state.addFilesToPackage(_ctx.targetPackagePath, migratedFiles);
                await _ctx.state.addStateFileToGit();
              }

              const reportOutputPath = resolve(options.basePath, options.outputPath);
              generateReports(reporter, reportOutputPath, options.report, {
                json: jsonFormatter,
                sarif: sarifFormatter,
                md: mdFormatter,
                sonarqube: sonarqubeFormatter,
              });

              const { totalErrorCount, errorFixedCount, hintAddedCount } = getReportSummary(
                reporter.report
              );
              const migratedFileCount = migratedFiles.length;
              task.title = `${migratedFileCount} JS ${
                migratedFileCount === 1 ? 'file' : 'files'
              } has been converted to TS. There are ${totalErrorCount} errors caught by rehearsal:
                - ${errorFixedCount} have been fixed automatically by rehearsal.
                - ${hintAddedCount} have been updated with @ts-expect-error @rehearsal TODO which need further manual check.`;
            } else {
              task.skip(
                `Skipping JS -> TS conversion task, since there is no JS file to be converted to TS.`
              );
            }
          },
        },
        {
          title: 'Creating eslint config',
          enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
          task: async (_ctx: MigrateCommandContext, task) => {
            if (_ctx.userConfig?.hasLintSetup) {
              task.title = `Creating .eslintrc.js from custom config.`;
              await _ctx.userConfig.lintSetup();
            } else {
              task.skip(`Skip creating .eslintrc.js since no custom config is provided.`);
            }
          },
        },
        {
          title: 'Creating new scripts for Typescript in package.json',
          enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
          task: async () => {
            addPackageJsonScripts(options.basePath, {
              'build:tsc': 'tsc -b',
              'lint:tsc': 'tsc --noEmit',
            });
          },
        },
      ],
      {
        concurrent: false,
        exitOnError: true,
        renderer: 'simple',
      }
    );
    try {
      await tasks.run();
    } catch (e) {
      await resetFiles();
      logger.error(`${e}`);
    }
  });
