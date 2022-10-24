#!/usr/bin/env node

// TODO: handle ctrl + c

import { resolve } from 'path';
import { migrate } from '@rehearsal/migrate';
import { getMigrationStrategy, SourceFile } from '@rehearsal/migration-graph';
import { jsonFormatter, mdFormatter, Reporter, sarifFormatter } from '@rehearsal/reporter';
import { Command } from 'commander';
import { existsSync, readJSONSync, writeJsonSync } from 'fs-extra';
import { Listr } from 'listr2';
import { createLogger, format, transports } from 'winston';

import { generateReports } from '../helpers/report';
import { MigrateCommandContext, MigrateCommandOptions } from '../types';
import { UserConfig } from '../userConfig';
import { addDep, determineProjectName, parseCommaSeparatedList, runModuleCommand } from '../utils';

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
  .requiredOption('-p, --basePath <project base path>', 'Base dir path of your project.')
  .option('-e, --entrypoint <entrypoint>', 'entrypoint js file for your project')
  .option(
    '-r, --report <reportTypes>',
    'Report types separated by comma, e.g. -r json,sarif,md',
    parseCommaSeparatedList,
    []
  )
  .option('-o, --outputPath <outputPath>', 'Reports output path', '.rehearsal')
  .option('-s, --strict', 'Use strict tsconfig file')
  .option(
    '-u, --userConfig <custom json config for migrate command>',
    'File path for custom config'
  )
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

            const strategy = getMigrationStrategy(options.basePath, {
              entrypoint: options.entrypoint,
            });
            const files: Array<SourceFile> = strategy.getMigrationOrder();
            _ctx.strategy = strategy;
            _ctx.sourceFilesWithAbsolutePath = files.map((f) => f.path);
            _ctx.sourceFilesWithRelativePath = files.map((f) => f.relativePath);

            task.title = `Initializatoin Completed! Running migration on ${_ctx.strategy.sourceType}`;
          },
        },
        {
          title: 'Installing dependencies',
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
          task: async (_ctx, task) => {
            if (_ctx.userConfig?.hasTsSetup) {
              task.title = `Creating tsconfig from custom config.`;
              await _ctx.userConfig.tsSetup();
            } else {
              const configPath = resolve(options.basePath, 'tsconfig.json');

              if (existsSync(configPath)) {
                task.skip(`${configPath} already exists, skipping creating tsconfig.json`);
              } else {
                task.title = `Creating ${options.strict ? 'strict' : 'basic'} tsconfig.`;

                createTSConfig(
                  options.basePath,
                  _ctx.sourceFilesWithRelativePath,
                  !!options.strict
                );
              }
            }
          },
        },
        {
          title: 'Converting JS files to TS',
          task: async (_ctx, task) => {
            const projectName = (await determineProjectName()) || '';
            const reporter = new Reporter(projectName, options.basePath, logger);

            if (_ctx.sourceFilesWithAbsolutePath) {
              const input = {
                basePath: options.basePath,
                sourceFiles: _ctx.sourceFilesWithAbsolutePath,
                logger: options.verbose ? logger : undefined,
                reporter,
              };

              await migrate(input);

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
          title: 'Run Typescript compiler to check errors',
          task: async () => {
            await runModuleCommand(['tsc'], { cwd: options.basePath });
          },
        },
        // TODO: what to do with those ts errors?

        {
          title: 'Creating lint config',
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
function createTSConfig(basePath: string, fileList: string[], strict: boolean): void {
  const include = [...fileList.map((f) => f.replace('.js', '.ts'))];
  const config = strict
    ? {
        $schema: 'http://json.schemastore.org/tsconfig',
        compilerOptions: {
          baseUrl: '.',
          outDir: 'dist',
          strict: true,
          noUncheckedIndexedAccess: true,
          module: 'es2020',
          moduleResolution: 'node',
          newLine: 'lf',
          forceConsistentCasingInFileNames: true,
          noFallthroughCasesInSwitch: true,
          target: 'es2020',
          lib: ['es2020'],
          esModuleInterop: true,
          declaration: true,
          sourceMap: true,
          declarationMap: true,
        },
        include,
      }
    : {
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
