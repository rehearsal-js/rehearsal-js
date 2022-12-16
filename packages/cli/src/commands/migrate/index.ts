#!/usr/bin/env node

import { Command } from 'commander';
import { Listr } from 'listr2';
import { createLogger, format, transports } from 'winston';
import { version } from '../../../package.json';

import { MigrateCommandOptions } from '../../types';
import { parseCommaSeparatedList, gitIsRepoDirty, resetFiles } from '../../utils';

import { initTask } from './tasks/init';
import { depInstallTask } from './tasks/depInstall';
import { convertTask } from './tasks/convert';
import { tsConfigTask } from './tasks/tsConfig';
import { lintConfigTask } from './tasks/lintConfig';
import { createScriptsTask } from './tasks/createScripts';

export const migrateCommand = new Command();

process.on('SIGINT', () => {
  console.log('Received SIGINT. Press Control-D to exit.');
});

migrateCommand
  .name('migrate')
  .description('Migrate Javascript project to Typescript')
  .option('-p, --basePath <project base path>', 'Base dir path of your project.', process.cwd())
  .option('-e, --entrypoint <entrypoint>', 'entrypoint js file for your project')
  .option(
    '-f, --format <format>',
    'Report format separated by comma, e.g. -f json,sarif,md,sonarqube',
    parseCommaSeparatedList,
    ['sarif']
  )
  .option('-o, --outputPath <outputPath>', 'Reports output path', '.rehearsal')
  .option(
    '-u, --userConfig <custom json config for migrate command>',
    'File path for custom config'
  )
  .option('-i, --interactive', 'Interactive mode to help migrate part of large apps')
  .option('-v, --verbose', 'Print more logs to debug.')
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
