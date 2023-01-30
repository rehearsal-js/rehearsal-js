#!/usr/bin/env node
import { Command } from 'commander';
import { Listr } from 'listr2';
import { createLogger, format, transports } from 'winston';

import { parseCommaSeparatedList, gitIsRepoDirty, resetFiles } from '@rehearsal/utils';
import { version } from '../../../package.json';
import {
  initTask,
  depInstallTask,
  convertTask,
  tsConfigTask,
  lintConfigTask,
  createScriptsTask,
  regenTask,
  validateTask,
} from './tasks';

import type { MigrateCommandOptions } from '../../types';

export const migrateCommand = new Command();

process.on('SIGINT', () => {
  console.log('Received SIGINT. Press Control-D to exit.');
});

migrateCommand
  .name('migrate')
  .description('migrate a javascript project to typescript')
  .option('-p, --basePath <project base path>', 'base directory of your project', process.cwd())
  .option('-e, --entrypoint <entrypoint>', 'entrypoint filepath of your project')
  .option(
    '-f, --format <format>',
    'report format separated by comma, e.g. -f json,sarif,md,sonarqube',
    parseCommaSeparatedList,
    ['sarif']
  )
  .option('-o, --outputPath <outputPath>', 'reports output directory', '.rehearsal')
  .option('-u, --userConfig <custom json config for migrate command>', 'path to rehearsal config')
  .option('-i, --interactive', 'interactive mode')
  .option('-v, --verbose', 'print debugging logs')
  .option('-d, --dryRun', 'print files that will be attempted to migrate', false)
  .option('-r, --regen', 'print out current migration status')
  .action(async (options: MigrateCommandOptions) => {
    await migrate(options);
  });

async function migrate(options: MigrateCommandOptions): Promise<void> {
  const loggerLevel = options.verbose ? 'debug' : 'info';
  const logger = createLogger({
    transports: [new transports.Console({ format: format.cli(), level: loggerLevel })],
  });

  logger.info(`@rehearsal/migrate ${version.trim()}`);

  if (!options.dryRun && !options.regen) {
    const hasUncommittedFiles = await gitIsRepoDirty(options.basePath);
    if (hasUncommittedFiles) {
      logger.warn(
        'You have uncommitted files in your repo. Please commit or stash them as Rehearsal will reset your uncommitted changes.'
      );
      process.exit(0);
    }
  }

  const defaultListrOption = {
    concurrent: false,
    exitOnError: true,
  };

  const tasks = [
    await validateTask(options, logger),
    await initTask(options),
    await depInstallTask(options),
    await tsConfigTask(options),
    await lintConfigTask(options),
    await createScriptsTask(options),
  ];

  try {
    if (options.interactive) {
      // For issue #549, have to use simple renderer for the interactive edit flow
      // previous ctx is needed for the isolated convertTask
      const ctx = await new Listr(tasks, defaultListrOption).run();
      await new Listr([await convertTask(options, logger, ctx)], {
        renderer: 'simple',
        ...defaultListrOption,
      }).run();
    } else if (options.regen) {
      const tasks = new Listr(
        [await validateTask(options, logger), await regenTask(options, logger)],
        defaultListrOption
      );
      await tasks.run();
    } else {
      await new Listr([...tasks, await convertTask(options, logger)], defaultListrOption).run();
    }
  } catch (e) {
    await resetFiles();
    logger.error(`${e}`);
  }
}
