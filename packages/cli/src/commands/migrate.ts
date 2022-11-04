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
import { existsSync, readJSONSync, writeJsonSync } from 'fs-extra';
import { Listr } from 'listr2';
import { createLogger, format, transports } from 'winston';

import { generateReports } from '../helpers/report';
import {
  MigrateCommandContext,
  MigrateCommandOptions,
  packageChoiceMap,
  PackageSelection,
} from '../types';
import { UserConfig } from '../userConfig';
import { addDep, determineProjectName, parseCommaSeparatedList, runModuleCommand } from '../utils';
import { State } from '../helpers/state';

const IN_PROGRESS_MARK = '🚧';
const COMPLETION_MARK = '✅';

function ifHasTypescriptInDevdep(basePath: string): boolean {
  const packageJSONPath = resolve(basePath, 'package.json');
  const packageJSON = readJSONSync(packageJSONPath);
  return (
    (packageJSON.devDependencies && packageJSON.devDependencies.typescript) ||
    (packageJSON.dependencies && packageJSON.dependencies.typescript)
  );
}

export const migrateCommand = new Command();

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
            // _ctx.skip = true;
            // get custom config
            const userConfig = options.userConfig
              ? new UserConfig(options.basePath, options.userConfig, 'migrate')
              : undefined;

            _ctx.userConfig = userConfig;

            const projectName = await determineProjectName(options.basePath);
            const packages = discoverEmberPackages(options.basePath);

            if (options.interactive) {
              // Init state and store
              const state = new State(
                projectName as string,
                packages.map((p) => p.path)
              );
              _ctx.state = state;

              const packageSelections: PackageSelection[] = packages.map((p) => {
                return {
                  name: p.packageName,
                  location: p.path,
                };
              });
              const packageChoiceMap = packageSelections.reduce((map, p) => {
                const { completeFileCount, totalFileCount } = _ctx.state.getPackageMigrateProgress(
                  p.location
                );
                // text to show the progress per package based on state
                let key = `${p.name}(no progress found)`;
                if (totalFileCount !== 0) {
                  const mark =
                    completeFileCount === totalFileCount ? COMPLETION_MARK : IN_PROGRESS_MARK;
                  key = `${mark} ${p.name} (${completeFileCount} of ${totalFileCount} completed)`;
                }
                map[key] = p.location;
                return map;
              }, {} as packageChoiceMap);

              _ctx.input = await task.prompt<{ test: boolean; other: boolean }>([
                {
                  type: 'Select',
                  name: 'packageSelection',
                  message:
                    'We have found multiple packages in your project, select the one to migrate:',
                  choices: Object.keys(packageChoiceMap),
                },
              ]);
              // update basePath based on the selection
              _ctx.targetPackagePath = packageChoiceMap[_ctx.input as string];
              task.title = `Initialization Completed! Running migration on ${_ctx.input}.`;
            } else {
              _ctx.targetPackagePath = options.basePath;
              task.title = `Initialization Completed! Running migration on ${projectName}.`;
            }

            // construct migration strategy and prepare all the files needs to be migrated
            const strategy = getMigrationStrategy(_ctx.targetPackagePath, {
              entrypoint: options.entrypoint,
              filterByPackageName: [],
            });
            const files: Array<SourceFile> = strategy.getMigrationOrder();
            _ctx.strategy = strategy;
            _ctx.sourceFilesWithAbsolutePath = files.map((f) => f.path);
            _ctx.sourceFilesWithRelativePath = files.map((f) => f.relativePath);
          },
        },
        {
          title: 'Installing dependencies',
          enabled: (ctx): boolean => !ctx.skip,
          task: async (_ctx, task) => {
            // install custom dependencies
            if (_ctx.userConfig?.hasDependencies) {
              task.title = `Installing custom dependencies`;
              await _ctx.userConfig.install();
            }

            if (ifHasTypescriptInDevdep(options.basePath)) {
              task.skip('typescript already exists. Skipping installing typescript.');
            } else {
              await addDep(['typescript'], true, { cwd: options.basePath });
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

                createTSConfig(options.basePath, _ctx.sourceFilesWithRelativePath);
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

/**
 * Generate tsconfig
 */
function createTSConfig(basePath: string, fileList: string[]): void {
  const include = [...fileList.map((f) => f.replace('.js', '.ts'))];
  const config = {
    $schema: 'http://json.schemastore.org/tsconfig',
    compilerOptions: {
      baseUrl: '.',
      outDir: 'dist',
      emitDeclarationOnly: true,
      allowJs: true,
      target: 'es2016',
      module: 'commonjs',
      moduleResolution: 'node',
    },
    include,
  };
  writeJsonSync(resolve(basePath, 'tsconfig.json'), config, { spaces: 2 });
}
