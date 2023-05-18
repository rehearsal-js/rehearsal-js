import { resolve } from 'node:path';
import { promises as fs } from 'node:fs';
import { Command, Option } from 'commander';
import { Listr } from 'listr2';
import debug from 'debug';
import { createLogger, format, transports } from 'winston';
import { parseCommaSeparatedList } from '@rehearsal/utils';
import { PackageJson } from 'type-fest';
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

/*
  @rehearsal/fix workflow

  rehearsal fix <path to source file | directory>
    the explicit source file OR explicit directory with implicit child directories fixed.
    migration strategy is ignored

  rehearsal fix <path to child package> --graph
    specify the child-package relative to process.cwd(). migration strategy is leveraged fixing all necessary files in the dependency graph for this package.
    migration strategy is leveraged

  rehearsal fix <path to child package> --graph --devDeps
    same as above but devDependencies are considered in the graph
*/

fixCommand
  .alias('infer')
  .name('fix')
  .description('fixes typescript compiler errors by inferring types on .*ts files')
  .argument('[srcPath]', 'path to file or directory to migrate', process.cwd())
  .option('--no-graph', 'opt out of fixing the file(s) with the graph')
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
    throw new Error(`@rehearsal/fix: you must specify a package or path to move`);
  }

  // source with a direct filepath ignores the migration graph
  const tasks = options.graph
    ? [
        initTask(srcPath, options),
        graphOrderTask(srcPath, {
          rootPath: options.rootPath,
          ignore: options.ignore,
          skipPrompt: true,
        }),
        convertTask(srcPath, options),
      ]
    : [initTask(srcPath, options), convertTask(srcPath, options)];

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
