#!/usr/bin/env node

// TODO: handle ctrl + c

import { migrate } from '@rehearsal/migrate';
import { jsonFormatter, mdFormatter, Reporter, sarifFormatter } from '@rehearsal/reporter';
import { Command } from 'commander';
import { cruise, ICruiseOptions, ICruiseResult, IDependency, IModule } from 'dependency-cruiser';
import { existsSync, readJSONSync, rmSync, writeJsonSync } from 'fs-extra';
import { Listr } from 'listr2';
import { resolve } from 'path';
import toposort from 'toposort';
import { createLogger, format, transports } from 'winston';

import {
  FormatterMap,
  MigrateCommandContext,
  MigrateCommandOptions,
  ParsedModuleResult,
} from '../types';
import { UserConfig } from '../userConfig';
import { addDep, determineProjectName, runYarnOrNpmCommand } from '../utils';

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
  .requiredOption('-e, --entrypoint <entrypoint>', 'entrypoint js file for your project')
  .option(
    '-r, --report <reportTypes>',
    'Report type separated by comma, e.g. -r json,sarif,md',
    commaSeparatedArgs
  )
  .option('-o, --outputPath <outputPath>', 'Reports output path')
  .option('-s, --strict', 'Use strict tsconfig file')
  .option('-c, --clean', 'Clean up old JS files after TS convertion')
  .option(
    '-u, --userConfig <custom json config for migrate command>',
    'File path for custom config'
  )
  .option('-v, --verbose', 'Print more logs to debug.')
  .action(async (options: MigrateCommandOptions) => {
    console.log(options);
    const loggerLevel = options.verbose ? 'debug' : 'info';
    const logger = createLogger({
      transports: [new transports.Console({ format: format.cli(), level: loggerLevel })],
    });

    // get custom config
    const userConfig = options.userConfig
      ? new UserConfig(options.basePath, options.userConfig, 'migrate')
      : undefined;

    const tasks = new Listr<MigrateCommandContext>(
      [
        {
          title: 'Installing dependencies',
          task: async (_ctx, task) => {
            // install custom dependencies
            if (userConfig?.hasDependencies) {
              task.title = `Installing custom dependencies`;
              await userConfig.install();
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
            if (userConfig?.hasTsSetup) {
              task.title = `Creating tsconfig from custom config.`;
              await userConfig.tsSetup();
            } else {
              const configPath = resolve(options.basePath, 'tsconfig.json');

              if (existsSync(configPath)) {
                task.skip(`${configPath} already exists, skipping creating tsconfig.json`);
              } else {
                task.title = `Creating ${options.strict ? 'strict' : 'basic'} tsconfig.`;
                const sourceFiles: Array<string> = getDependencyOrder(options.entrypoint);
                createTSConfig(options.basePath, sourceFiles, !!options.strict);
              }
            }
          },
        },
        {
          title: 'Converting JS files to TS',
          task: async (ctx, task) => {
            const projectName = (await determineProjectName()) || '';
            const reporter = new Reporter(projectName, options.basePath, logger);

            const sourceFiles: Array<string> = getDependencyOrder(options.entrypoint);
            ctx.sourceFiles = sourceFiles;
            if (sourceFiles) {
              const input = {
                basePath: options.basePath,
                sourceFiles,
                logger: options.verbose ? logger : undefined,
                reporter,
              };

              await migrate(input);

              // Generate reports
              if (options.report) {
                const reportBaseName = '.rehearsal-report';
                const outputPath = options.outputPath ? options.outputPath : options.basePath;
                const formatters: FormatterMap = {
                  json: jsonFormatter,
                  sarif: sarifFormatter,
                  md: mdFormatter,
                };
                options.report.forEach((format) => {
                  if (formatters[format]) {
                    // only generate report for supported formatter
                    const report = resolve(outputPath, `${reportBaseName}.${format}`);
                    reporter.print(report, formatters[format]);
                  }
                });
              }
            } else {
              task.skip(
                `Skipping JS -> TS convertion task, since there is no JS file to be converted to TS.`
              );
            }
          },
        },
        {
          title: 'Clean up old JS files', // TODO: flag
          task: async (ctx, task) => {
            if (ctx.sourceFiles.length && options.clean) {
              cleanJSFiles(ctx.sourceFiles);
            } else {
              task.skip(`Skipping clean up task`);
            }
          },
        },
        {
          title: 'Run Typescript compiler to check errors',
          task: async () => {
            await runYarnOrNpmCommand(['tsc'], { cwd: options.basePath });
          },
        },
        // TODO: what to do with those ts errors?

        {
          title: 'Creating lint config',
          task: async (_ctx, task) => {
            if (userConfig?.hasLintSetup) {
              task.title = `Creating .eslintrc.js from custom config.`;
              await userConfig.lintSetup();
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
 * @param basePath Project root to run migration
 */
function createTSConfig(basePath: string, fileList: Array<string>, strict: boolean): void {
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

/**
 * Remove files
 * @param fileList Array of file paths
 */
function cleanJSFiles(fileList: Array<string>): void {
  fileList.filter((f) => f.match(/\.js$/)).forEach((f) => rmSync(f));
}

// Feed entrypoint to dependency-cruise to get an array or file list with migration order
function getDependencyOrder(entrypoint: string): Array<string> {
  const cruiseOptions: ICruiseOptions = {
    exclude: {
      path: 'node_modules',
    },
  };

  const output = cruise([entrypoint], cruiseOptions).output as ICruiseResult;

  const { edgeList, coreDepList } = parseModuleList(output.modules);

  const dependencyList = toposort(edgeList).reverse(); // leaf frist

  // remove core deps (fs, path, os, etc) from depList
  return dependencyList.filter((d) => {
    return !coreDepList.includes(d);
  });
}

// Process IModule[] from dependency-cruise to create
// 1. directional edges (graph) -> [module, dependency]
// 2. List of core deps which should be exclude in migration files
function parseModuleList(moduleList: IModule[]): ParsedModuleResult {
  const edgeList: Array<[string, string | undefined]> = [];
  const coreDepList: Array<string> = [];

  moduleList.forEach((m: IModule) => {
    if (m.dependencies.length > 0) {
      m.dependencies.forEach((d: IDependency) => {
        if (d.dependencyTypes.includes('core') && !coreDepList.includes(d.resolved)) {
          coreDepList.push(d.resolved);
        }
        edgeList.push([m.source, d.resolved]);
      });
    }
  });
  return { edgeList, coreDepList };
}

// helper function to parse a,b,c to [a, b, c]
function commaSeparatedArgs(input: string): string[] {
  return input.split(',');
}
