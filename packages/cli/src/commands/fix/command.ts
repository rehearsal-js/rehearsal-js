import { join, resolve } from 'node:path';
import { promises as fs } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Command, Option } from 'commander';
import { Listr } from 'listr2';
import debug from 'debug';
import { createLogger, format, transports } from 'winston';
import { parseCommaSeparatedList } from '@rehearsal/utils';
import { PackageJson } from 'type-fest';
import { SUPPORTED_JS_EXTENSIONS } from '@rehearsal/migration-graph';
import { FixCommandOptions } from '../../types.js';
import { graphOrderTask } from '../graph/tasks/graphOrderTask.js';
import { initTask } from './tasks/initialize-task.js';
import { convertTask } from './tasks/convert-task.js';

const __dirname = new URL('.', import.meta.url).pathname;
const { version } = JSON.parse(
  await fs.readFile(resolve(__dirname, '../../../package.json'), 'utf-8')
) as PackageJson;

const DEBUG_CALLBACK = debug('rehearsal:cli:fix-command');

const winstonLogger = createLogger({
  transports: [new transports.Console({ format: format.cli(), level: 'info' })],
});

export const fixCommand = new Command();

fixCommand
  .alias('infer')
  .name('fix')
  .description('fixes typescript compiler errors by inferring types on .*ts files')
  .argument('[srcPath]', 'path to file or directory to migrate', process.cwd())
  .option(
    '--graph',
    'fixing all file(s) within the graph, which might include files outside of the srcPath'
  )
  .option(
    '--ignore [globs...]',
    `comma-delimited list of globs to ignore eg. '--ignore tests/**/*,types/**/*'`,
    parseCommaSeparatedList,
    []
  )
  .option(
    '-f, --format <format>',
    'report format separated by comma, e.g. -f json,sarif,md,sonarqube',
    parseCommaSeparatedList,
    ['sarif']
  )
  .option(
    '--skipChecks [checks...]',
    'skips the specified checks when initializing fix task eg. eslint, deps, tsconfig',
    parseCommaSeparatedList,
    []
  )
  .addOption(
    new Option('--rootPath <project root directory>', '-- HIDDEN LOCAL DEV TESTING ONLY --')
      .default(process.cwd())
      .hideHelp()
  )
  .action(async (srcPath: string, options: FixCommandOptions) => {
    await fix(srcPath, options);
  });

async function fix(srcPath: string, options: FixCommandOptions): Promise<void> {
  winstonLogger.info(`@rehearsal/fix ${version?.trim()}`);

  if (!srcPath) {
    throw new Error(`@rehearsal/fix: you must specify a package or path to fix`);
  }

  const isDirectory = (await stat(srcPath)).isDirectory();

  if (isDirectory) {
    const javascriptGlobs = [...SUPPORTED_JS_EXTENSIONS, '*.d.ts'].map((ext) => {
      return join(`${options.rootPath}`, srcPath, `**/*${ext}`);
    });

    // we don't want to try and fix JS files
    options.ignore.push(...javascriptGlobs);
  }

  options.mode =
    process.env['EXPERIMENTAL_MODES'] === 'drain'
      ? process.env['EXPERIMENTAL_MODES']
      : 'single-pass';

  // graph mode is default on in all instances. exception is for testing only with node process env variable "GRAPH_MODES=off"
  // source with a direct filepath ignores the migration graph
  const tasks =
    process.env['GRAPH_MODES'] === 'off'
      ? [initTask(srcPath, options), convertTask(srcPath, options)]
      : [
          initTask(srcPath, options),
          graphOrderTask(srcPath, {
            rootPath: options.rootPath,
            ignore: options.ignore,
            graph: options.graph,
            output: undefined,
          }),
          convertTask(srcPath, options),
        ];

  DEBUG_CALLBACK(`tasks: ${JSON.stringify(tasks, null, 2)}`);
  DEBUG_CALLBACK(`options: ${JSON.stringify(options, null, 2)}`);

  try {
    await new Listr(tasks, {
      concurrent: false,
    }).run();
  } catch (e) {
    // listr will log the error we just need to exit
  }
}
