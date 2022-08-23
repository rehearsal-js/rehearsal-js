#!/usr/bin/env node

import { Command } from 'commander';
import winston from 'winston';
import { migrate, MigrateInput } from '@rehearsal/migrate';
import { Reporter } from '@rehearsal/reporter';
import fs from 'fs-extra';
import { Listr } from 'listr2';
import { resolve } from 'path';
import glob from 'glob';
import { determineProjectName } from '../utils';

const migrateCommand = new Command();

type migrateCommandOptions = {
  root: string;
  globs: string;
  files: string;
  report_output: string;
  verbose: boolean | undefined;
  clean: boolean | undefined;
  skip_config: boolean | undefined;
};

migrateCommand
  .description('Typescript migration from Javascript')
  .option('-r, --root <project root>', 'Base dir (root) of your project.')
  // TODO: do we still need dirs option, since we alteady have globs?
  // .option(
  //   '-d, --dirs <source directory>',
  //   'JS source directories relative to root, separated by comma'
  // )
  .option('-g, --globs <glob patterns>', 'glob patterns like src/**/*.js, separated by comma')
  .option('-f, --files <source files>', 'JS source files relative to root, separated by comma')
  .option('-r, --report_output <report output dir>', 'Target directory for the report output')
  .option('-v, --verbose', 'Print more logs to debug.')
  .option('-c, --clean', 'Remove source JS files after migration.')
  .option('-s, --skip_config', 'Skip creating tsconfig.json and use existed one.')
  .action(async (options: migrateCommandOptions) => {
    const loggerLevel = options.verbose ? 'debug' : 'info';
    const logger = winston.createLogger({
      transports: [
        new winston.transports.Console({ format: winston.format.cli(), level: loggerLevel }),
      ],
    });

    // foo.js,bar.js -> [{root}/foo.js, {root}/bar.js]
    const srcFiles = options.files ? options.files.split(',').map((d) => d.trim()) : [];
    // src/**/*.js,lib/*.js -> ['src/**/*.js', 'lib/*.js']
    const srcGlobs = options.globs ? options.globs.split(',').map((d) => d.trim()) : [];

    // complete absolute file array from --files
    const srcFileList = srcFiles.map((p) => resolve(options.root, p));

    // get complete file list from array of globs
    // ['src/**/*.js, lib/*.js] -> [{root}/src/foo.js, {root}/src/bar.js, {root}/lib/foo.js]
    const srcGlobsFileList = (
      await Promise.all(
        srcGlobs.map(async (g) => {
          const list = await getMatchedFileList(resolve(options.root, g));
          return list;
        })
      )
    ).flat();

    const tasks = new Listr([
      {
        title: 'Creating tsconfig.json',
        skip: (ctx): boolean => ctx.skip,
        task: async (_ctx, task) => {
          if (options.skip_config) {
            return task.skip('skipping creating tsconfig.json');
          }
          const configPath = resolve(options.root, 'tsconfig.json');

          if (fs.existsSync(configPath)) {
            throw new Error(
              `${configPath} already exists. Please re-run the command with "--skip-config" to use existing tsconfig.json.`
            );
          } else {
            logger.info(`No tsconfig.json found, creating ${configPath}.`);
            createTSConfig(options.root, srcGlobs, srcFiles);
          }
        },
      },
      {
        title: 'Migrating JS to TS',
        skip: (ctx): boolean => ctx.skip,
        task: async () => {
          const projectName = (await determineProjectName()) || '';
          const reporter = new Reporter(
            projectName,
            options.report_output ? options.report_output : options.root,
            logger
          );
          const sourceFiles: Array<string> = [...srcFileList, ...srcGlobsFileList];
          const input: MigrateInput = {
            basePath: options.root,
            sourceFiles,
            logger,
            reporter,
          };

          await migrate(input);
        },
      },
      {
        title: 'Clean up old JS files',
        skip: (ctx): boolean => ctx.skip,
        task: async () => {
          // TODO: remove all old js files with --clean
        },
      },
    ]);
    try {
      await tasks.run();
    } catch (e) {
      logger.error(`${e}`);
    }
  });

migrateCommand.parse(process.argv);

/**
 * Generate tsconfig
 * @param root Project root to run migration
 * @param globs Array of globs for file matching
 * @param files Array of specific files
 */
function createTSConfig(root: string, globs: Array<string>, files: Array<string>): void {
  // TODO: what is the corrent config to use here?
  const config = {
    $schema: 'http://json.schemastore.org/tsconfig',
    compilerOptions: {
      allowSyntheticDefaultImports: true,
      composite: true,
      declaration: true,
      declarationMap: true,
      esModuleInterop: true,
      module: 'commonjs',
      moduleResolution: 'node',
      newLine: 'LF',
      noImplicitAny: true,
      noImplicitReturns: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      resolveJsonModule: true,
      sourceMap: true,
      strict: true,
      target: 'es2017',
    },
    // dirs and files come from cli args would be .js
    include: [...globs, ...files].map((f) => f.replace('.js', '.ts')),
  };
  fs.writeJsonSync(resolve(root, 'tsconfig.json'), config, { spaces: 2 });
}

/**
 * Returns an array of matched file path
 * @param pattern glob pattern
 * @returns Promise<Array<string>>
 */
function getMatchedFileList(pattern: string): Promise<Array<string>> {
  return new Promise((resolve, reject) => {
    glob(pattern, (err, files) => {
      if (err) {
        reject(err);
      }
      resolve(files);
    });
  });
}
