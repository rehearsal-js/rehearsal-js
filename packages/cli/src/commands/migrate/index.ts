#!/usr/bin/env node
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { Command } from 'commander';
import { Listr } from 'listr2';
import { createLogger, format, transports } from 'winston';
import {
  parseCommaSeparatedList,
  gitIsRepoDirty,
  resetFiles,
  ensureAbsolutePath,
} from '@rehearsal/utils';
import { readJsonSync } from 'fs-extra/esm';
import {
  initTask,
  depInstallTask,
  convertTask,
  tsConfigTask,
  lintConfigTask,
  createScriptsTask,
  regenTask,
  validateTask,
  reportExisted,
} from './tasks/index.js';

import { sequentialTask } from './tasks/sequential.js';
import type { MigrateCommandOptions, PreviousRuns } from '../../types.js';

const __dirname = new URL('.', import.meta.url).pathname;
const { version } = readJsonSync(resolve(__dirname, '../../../package.json')) as {
  version: string;
};

export const migrateCommand = new Command();

process.on('SIGINT', () => {
  console.log('Received SIGINT. Press Control-D to exit.');
});

migrateCommand
  .name('migrate')
  .description('migrate a javascript project to typescript')
  .option('--init', 'only initializes the project', false)
  .option(
    '-p, --basePath <project base path>',
    'base directory of your project',
    ensureAbsolutePath,
    process.cwd()
  )
  .option('-e, --entrypoint <entrypoint>', 'migrate the directory and its imported files specified by entrypoint', '')
  .option(
    '-f, --format <format>',
    'report format separated by comma, e.g. -f json,sarif,md,sonarqube',
    parseCommaSeparatedList,
    ['sarif']
  )
  .option('-o, --outputPath <outputPath>', 'reports output directory', '.rehearsal')
  .option(
    '-u, --userConfig <custom json config for migrate command>',
    'path to rehearsal config',
    'rehearsal-config.json'
  )
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

  // Show git warning if:
  // 1. Not --dryRun
  // 2. Not --regen
  // 3. First time run (check if any report exists)
  if (!options.dryRun && !options.regen && !reportExisted(options.basePath, options.outputPath)) {
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
    if (options.init) {
      await new Listr(tasks, defaultListrOption).run();
    } else if (options.interactive) {
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
    } else if (reportExisted(options.basePath, options.outputPath)) {
      const previousRuns = getPreviousRuns(
        options.basePath,
        options.outputPath,
        options.entrypoint
      );
      if (previousRuns.paths.length > 0) {
        logger.info(
          `Existing report(s) detected. Existing report(s) will be regenerated and merged into current report.`
        );
        await new Listr(
          [
            await validateTask(options, logger),
            await sequentialTask(options, logger, previousRuns),
          ],
          defaultListrOption
        ).run();
      } else {
        await new Listr([...tasks, await convertTask(options, logger)], defaultListrOption).run();
      }
    } else {
      await new Listr([...tasks, await convertTask(options, logger)], defaultListrOption).run();
    }
  } catch (e) {
    await resetFiles();
    logger.error(`${e}`);
  }
}

function getPreviousRuns(basePath: string, outputDir: string, entrypoint: string): PreviousRuns {
  const jsonReportPath = resolve(basePath, outputDir, 'migrate-report.json');

  let previousRuns: PreviousRuns = { paths: [], previousFixedCount: 0 };

  if (existsSync(jsonReportPath)) {
    const report = readJsonSync(jsonReportPath);
    const { summary, fixedItemCount: previousFixedCount } = report;
    previousRuns = {
      ...previousRuns,
      previousFixedCount,
    };

    for (const s of summary) {
      // different from current basePath or current entrypoint, need to run regen for previous runs.
      if (s.basePath !== basePath || s.entrypoint !== entrypoint) {
        previousRuns = {
          ...previousRuns,
          paths: [...previousRuns.paths, { basePath: s.basePath, entrypoint: s.entrypoint }],
        };
      }
    }
  }
  return previousRuns;
}
