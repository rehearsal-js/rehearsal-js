#!/usr/bin/env node
import { join, resolve } from 'node:path';
import { Command, Option } from 'commander';
import { Listr } from 'listr2';
import debug from 'debug';
import { parseCommaSeparatedList, readJSON } from '@rehearsal/utils';
import { createLogger, format, transports } from 'winston';
import { SUPPORTED_TS_EXTENSIONS } from '@rehearsal/migration-graph';
import { graphOrderTask } from '../graph/tasks/graphOrderTask.js';
import { moveTask } from './tasks/mv.js';
import { initTask } from './tasks/init.js';
import type { PackageJson } from 'type-fest';
import type { MoveCommandOptions } from '../../types.js';

const __dirname = new URL('.', import.meta.url).pathname;
const { version } = readJSON(resolve(__dirname, '../../../package.json')) as PackageJson;

export const moveCommand = new Command();
const DEBUG_CALLBACK = debug('rehearsal:cli:move-command');

// winston is leveraged before listr is initialized as logging API
// for debugging use DEBUG=rehearsal:* | DEBUG=rehearsal:move
const winstonLogger = createLogger({
  transports: [new transports.Console({ format: format.cli(), level: 'info' })],
});

moveCommand
  .name('move')
  .alias('mv')
  .description('graph aware git mv from .js -> .ts')
  .argument('[srcPath]', 'path to a directory or file', '')
  .option('--no-graph', 'opt out of moving the file(s) with the graph')
  .option(
    '--ignore [globs...]',
    `comma-delimited list of globs to ignore eg. '--ignore tests/**/*,types/**/*'`,
    parseCommaSeparatedList,
    []
  )
  .option('-d, --dryRun', `do nothing; only show what would happen`, false)
  .addOption(
    new Option('--rootPath <project base path>', '-- HIDDEN LOCAL DEV TESTING ONLY --')
      .default(process.cwd())
      .argParser(() => process.cwd())
      .hideHelp()
  )
  .action(async (srcPath: string, options: MoveCommandOptions) => {
    await move(srcPath, options);
  });

async function move(srcPath: string, options: MoveCommandOptions): Promise<void> {
  winstonLogger.info(`@rehearsal/move ${version?.trim()}`);

  if (!srcPath) {
    throw new Error(`@rehearsal/move: you must specify a package or path to move`);
  }

  const typescriptGlobs = SUPPORTED_TS_EXTENSIONS.map((ext) => {
    return join(`${options.rootPath}`, srcPath, `**/*${ext}`);
  });
  // We never want to move typescript files or the ember-cli-build.js files
  options.ignore.push(...typescriptGlobs);

  const tasks = options.graph
    ? [
        graphOrderTask(srcPath, {
          rootPath: options.rootPath,
          ignore: options.ignore,
          skipPrompt: true,
        }),
        moveTask(srcPath, options),
      ]
    : [initTask(srcPath, options), moveTask(srcPath, options)];

  DEBUG_CALLBACK(`tasks: ${JSON.stringify(tasks, null, 2)}`);
  DEBUG_CALLBACK(`options: ${JSON.stringify(options, null, 2)}`);

  try {
    await new Listr(tasks, {
      concurrent: false,
    }).run();
  } catch (e) {
    // e we dont need to log this because Listr will have already logged it
  }
}
