import { resolve } from 'node:path';
import { promises as fs } from 'node:fs';
import { Command, Option } from 'commander';
import { Listr } from 'listr2';
import debug from 'debug';
import { createLogger, format, transports } from 'winston';
import { isDirectory, parseCommaSeparatedList } from '@rehearsal/utils';
import { PackageJson } from 'type-fest';
import { FixCommandOptions, FixTasks, GraphTasks } from '../../types.js';

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

  rehearsal fix --source <path to source file | directory>
    the explicit source file OR explicit directory with implicit child directories moved.
    migration strategy is ignored with source-file and leveraged with directory

  rehearsal fix --package <path to child package>
    specify the child-package relative to process.cwd(). migration strategy is leveraged moving all necessary files in the dependency graph for this package.
    migration strategy is leveraged
*/

fixCommand
  .alias('infer')
  .name('fix')
  .description('provides type inference against typescript projects')
  .addOption(
    new Option('-b, --basePath <project base path>', '-- HIDDEN LOCAL DEV TESTING ONLY --')
      .default(process.cwd())
      .argParser(() => process.cwd())
      .hideHelp()
  )
  .option(
    '-s, --source <path to source file | directory>',
    `the explicit source file OR explicit directory with implicit child directories moved. migration strategy is ignored`,
    ''
  )
  .option(
    '-p, --childPackage <path to child package>',
    `specify the child-package relative to process.cwd(). migration strategy is leveraged moving all necessary files in the dependency graph for this package`,
    ''
  )
  .option(
    '-f, --format <format>',
    'report format separated by comma, e.g. -f json,sarif,md,sonarqube',
    parseCommaSeparatedList,
    ['sarif']
  )
  .option('-w, --wizard', 'interactive wizard will prompt on a file-by-file basis', false)
  .option('-d, --dryRun', `do nothing; only show what would happen`, false)
  .action(async (options: FixCommandOptions) => {
    await fix(options);
  });

async function fix(options: FixCommandOptions): Promise<void> {
  winstonLogger.info(`@rehearsal/fix ${version?.trim()}`);

  const { childPackage, source, wizard } = options;

  // if both childPackage and source are specified, throw an error
  if (childPackage && source) {
    throw new Error(
      `@rehearsal/fix: --childPackage AND --source are specified, please specify only one`
    );
  } else if (!childPackage && !source) {
    throw new Error(`@rehearsal/fix: you must specify a flag, either --childPackage OR --source`);
  }

  // grab the child fix tasks
  const { convertTask, initTask } = await loadFixTasks();
  const { graphOrderTask } = await loadGraphTasks();

  // source with a direct filepath ignores the migration graph
  const tasks =
    source && !isDirectory(source)
      ? [initTask(options), convertTask(options)]
      : [initTask(options), graphOrderTask(options), convertTask(options)];

  DEBUG_CALLBACK(`tasks: ${JSON.stringify(tasks, null, 2)}`);
  DEBUG_CALLBACK(`options: ${JSON.stringify(options, null, 2)}`);

  try {
    // if interactive
    if (wizard) {
      // For issue #549, use simple renderer for the interactive edit flow
      await new Listr(tasks, {
        concurrent: false,
        renderer: 'simple',
      }).run();
    } else {
      await new Listr(tasks, {
        concurrent: false,
      }).run();
    }
  } catch (e) {
    if (e instanceof Error) {
      winstonLogger.error(`${e.message + '\n' + (e.stack || '')}`);
    }
  }
}

async function loadFixTasks(): Promise<FixTasks> {
  return await import('./tasks/index.js').then((m) => {
    const { initTask, convertTask } = m;

    return {
      initTask,
      convertTask,
    };
  });
}

async function loadGraphTasks(): Promise<GraphTasks> {
  return await import('../graph/tasks/graphOrderTask.js').then((m) => {
    const { graphOrderTask } = m;

    return {
      graphOrderTask,
    };
  });
}
