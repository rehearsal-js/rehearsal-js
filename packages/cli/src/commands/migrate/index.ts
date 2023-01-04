#!/usr/bin/env node

import { Command } from 'commander';
import { Listr } from 'listr2';
import { createLogger, format, transports } from 'winston';

import { version } from '../../../package.json';
import { parseCommaSeparatedList, gitIsRepoDirty, resetFiles } from '../../utils';
import {
  initTask,
  depInstallTask,
  convertTask,
  tsConfigTask,
  lintConfigTask,
  createScriptsTask,
} from './tasks';

import type { MigrateCommandOptions } from '../../types';

export const migrateCommand = new Command();

process.on('SIGINT', () => {
  console.log('Received SIGINT. Press Control-D to exit.');
});

migrateCommand
  .name('migrate')
  .description('migrate a javascript project to typescript')
  .option(
    '-p, --basePath <project base path>',
    'base directory path of your project',
    process.cwd()
  )
  .option('-e, --entrypoint <entrypoint>', 'entrypoint js file for your project')
  .option(
    '-f, --format <format>',
    'report format separated by comma, e.g. -f json,sarif,md,sonarqube',
    parseCommaSeparatedList,
    ['sarif']
  )
  .option('-o, --outputPath <outputPath>', 'reports output path', '.rehearsal')
  .option('-u, --userConfig <custom json config for migrate command>', 'path to a custom config')
  .option('-i, --interactive', 'interactive mode')
  .option('-v, --verbose', 'print all logs for debugging')
  .action(async (options: MigrateCommandOptions) => {
    const loggerLevel = options.verbose ? 'debug' : 'info';
    const logger = createLogger({
      transports: [new transports.Console({ format: format.cli(), level: loggerLevel })],
    });

    console.log(`@rehearsal/migrate ${version.trim()}`);

    const hasUncommittedFiles = await gitIsRepoDirty(options.basePath);
    if (hasUncommittedFiles) {
      logger.warn(
        'You have uncommitted files in your repo. Please commit or stash them as Rehearsal will reset your uncommitted changes.'
      );
      process.exit(0);
    }

    const tasks = new Listr(
      [
        initTask(options),
        depInstallTask(options),
        tsConfigTask(options),
        convertTask(options, logger),
        lintConfigTask(),
        createScriptsTask(options),
      ],
      {
        concurrent: false,
        exitOnError: true,
        renderer: 'simple',
      }
    );
    try {
      await tasks.run();
    } catch (e) {
      await resetFiles();
      logger.error(`${e}`);
    }
  });
