import { Command, Option } from 'commander';
import { Listr } from 'listr2';
import { createLogger, format, transports } from 'winston';

import {
  initTask,
  depInstallTask,
  tsConfigTask,
  lintConfigTask,
  createScriptsTask,
  validateTask,
} from './tasks/index.js';
import type { MigrateCommandOptions } from '../../types.js';

// subcommand migrate init
export const initCommand = new Command();

initCommand
  .name('init')
  .description(
    'Install required dependencies, setup tsconfig.json, eslint config and essential package scrtips'
  )
  .addOption(
    new Option('-p, --basePath <project base path>', 'base directory of your project')
      .default(process.cwd())
      // use argParser to ensure process.cwd() is basePath
      // even use passes anything accidentally
      .argParser(() => process.cwd())
      .hideHelp()
  )
  .option(
    '-u, --userConfig <custom json config for migrate command>',
    'path to rehearsal config',
    'rehearsal-config.json'
  )
  .option('-v, --verbose', 'print debugging logs')
  .action(async (options: MigrateCommandOptions) => {
    await initCommandHandler(options);
  });

export async function initCommandHandler(options: MigrateCommandOptions): Promise<void> {
  // init should never run in interactive mode
  options.ci = true;

  const loggerLevel = options.verbose ? 'debug' : 'info';
  const logger = createLogger({
    transports: [new transports.Console({ format: format.cli(), level: loggerLevel })],
  });
  const defaultListrOption = {
    collapse: false,
    collapseErrors: false,
    concurrent: false,
    exitOnError: true,
  };

  const tasks = [
    validateTask(options, logger),
    initTask(options),
    depInstallTask(options),
    tsConfigTask(options),
    lintConfigTask(options),
    createScriptsTask(options),
  ];

  try {
    await new Listr(tasks, defaultListrOption).run();
    logger.info(
      `The project is ready for migration. Please run "rehearsal migrate" to start the migration.`
    );
  } catch (e) {
    logger.error(`${e}`);
  }
}
