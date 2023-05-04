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

  rehearsal move <path to source file | directory>
    the explicit source file OR explicit directory with implicit child directories moved.
    migration strategy is ignored

  rehearsal move <path to child package> --graph
    specify the child-package relative to process.cwd(). migration strategy is leveraged moving all necessary files in the dependency graph for this package.
    migration strategy is leveraged

  rehearsal move <path to child package> --graph --devDeps
    same as above but devDependencies are considered in the graph
*/

moveCommand
  .name('move')
  .alias('mv')
  .description('git mv conversion of JS files -> TS files')
  .argument('[srcDir]', 'the path to a package or file that will be moved', '')
  .option('-g, --graph', 'Enable graph resolution of files to move', false)
  .option('--devDeps', `Follow packages in 'devDependencies' when moving`)
  .option('--deps', `Follow packages in 'devDependencies' when moving`)
  .option('--ignore [srcDirs...]', `A comma deliminated list of packages to ignore`, [])
  .option('--dryRun', `Do nothing; only show what would happen`, false)
  .addOption(
    new Option('-b, --basePath <project base path>', '-- HIDDEN LOCAL DEV TESTING ONLY --')
      .default(process.cwd())
      .argParser(() => process.cwd())
      .hideHelp()
  )
  .action(async (srcDir: string, options: MoveCommandOptions) => {
    await move(srcDir, options);
  });

async function move(srcDir: string, options: MoveCommandOptions): Promise<void> {
  winstonLogger.info(`@rehearsal/move ${version?.trim()}`);

  if (options.graph && !options.deps && !options.devDeps) {
    console.warn(
      `Passing --graph without --deps, --devDeps, or both results in only analyzing the local files in the package.`
    );
  }

  if (!options.graph && options.devDeps) {
    throw new Error(`'--devDeps' can only be passed when you pass --graph`);
  }

  if (!options.graph && options.deps) {
    throw new Error(`'--deps' can only be passed when you pass --graph`);
  }

  if (!options.graph && options.ignore.length > 0) {
    throw new Error(`'--ignore' can only be passed when you pass --graph`);
  }

  if (!srcDir) {
    throw new Error(`@rehearsal/move: you must specify a package or path to move`);
  }

  // grab the child move tasks
  const { initTask, moveTask } = await loadMoveTasks();
  const { graphOrderTask } = await loadGraphTasks();

  const tasks = options.graph
    ? [
        initTask(srcDir, options),
        graphOrderTask({
          basePath: options.basePath,
          srcDir,
          devDeps: options.devDeps,
          deps: options.deps,
        }),
        moveTask(srcDir, options),
      ]
    : [initTask(srcDir, options), moveTask(srcDir, options)];

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
