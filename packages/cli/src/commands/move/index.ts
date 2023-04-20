#!/usr/bin/env node
import { resolve } from 'node:path';
import { Command, Option } from 'commander';
import { Listr } from 'listr2';
import debug from 'debug';
import { createLogger, format, transports } from 'winston';
import { readJSON } from '@rehearsal/utils';
import type { MoveTasks, GraphTasks, MoveCommandOptions } from '../../types.js';
import type { PackageJson } from 'type-fest';

const __dirname = new URL('.', import.meta.url).pathname;
const { version } = readJSON(resolve(__dirname, '../../../package.json')) as PackageJson;

export const moveCommand = new Command();
const DEBUG_CALLBACK = debug('rehearsal:cli:move-command');

// winston is leveraged before listr is initialized as logging API
// for debugging use DEBUG=rehearsal:* | DEBUG=rehearsal:move
const winstonLogger = createLogger({
  transports: [new transports.Console({ format: format.cli(), level: 'info' })],
});

/*
  @rehearsal/move workflow

  rehearsal move --source <path to source file | directory>
    the explicit source file OR explicit directory with implicit child directories moved.
    migration strategy is ignored

  rehearsal move --package <path to child package>
    specify the child-package relative to process.cwd(). migration strategy is leveraged moving all necessary files in the dependency graph for this package.
    migration strategy is leveraged
*/

moveCommand
  .name('move')
  .alias('mv')
  .description('git mv conversion of JS files -> TS files')
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
  .option('-d, --dryRun', `Do nothing; only show what would happen`, false)
  .addOption(
    new Option('-b, --basePath <project base path>', '-- HIDDEN LOCAL DEV TESTING ONLY --')
      .default(process.cwd())
      .argParser(() => process.cwd())
      .hideHelp()
  )
  .action(async (options: MoveCommandOptions) => {
    await move(options);
  });

async function move(options: MoveCommandOptions): Promise<void> {
  winstonLogger.info(`@rehearsal/move ${version?.trim()}`);

  const { childPackage, source } = options;

  // if both childPackage and source are specified, throw an error
  if (childPackage && source) {
    throw new Error(
      `@rehearsal/move: --childPackage AND --source are specified, please specify only one`
    );
  } else if (!childPackage && !source) {
    throw new Error(`@rehearsal/move: you must specify a flag, either --childPackage OR --source`);
  }

  // grab the child move tasks
  const { initTask, moveTask } = await loadMoveTasks();
  const { graphOrderTask } = await loadGraphTasks();

  const tasks = options.source
    ? [initTask(options), moveTask(options)]
    : [initTask(options), graphOrderTask(options), moveTask(options)];

  DEBUG_CALLBACK(`tasks: ${JSON.stringify(tasks, null, 2)}`);
  DEBUG_CALLBACK(`options: ${JSON.stringify(options, null, 2)}`);

  try {
    await new Listr(tasks, {
      concurrent: false,
    }).run();
  } catch (e) {
    if (e instanceof Error) {
      winstonLogger.error(`${e.message + '\n' + (e.stack || '')}`);
    }
  }
}

async function loadMoveTasks(): Promise<MoveTasks> {
  return await import('./tasks/index.js').then((m) => {
    const { initTask, moveTask } = m;

    return {
      initTask,
      moveTask,
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
