#!/usr/bin/env node
import { resolve, relative, isAbsolute } from 'path';
import { existsSync } from 'fs';
import { Command } from 'commander';
import { Listr } from 'listr2';
import { createLogger, format, transports } from 'winston';

import {
  parseCommaSeparatedList,
  gitIsRepoDirty,
  resetFiles,
  findWorkspaceRoot,
} from '@rehearsal/utils';
import { readJsonSync } from 'fs-extra';
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
  reportExisted,
} from './tasks';

import { sequentialTask } from './tasks/sequential';
import type { MigrateCommandOptions, PreviousRuns } from '../../types';

export const migrateCommand = new Command();

process.on('SIGINT', () => {
  console.log('Received SIGINT. Press Control-D to exit.');
});

migrateCommand
  .name('migrate')
  .description('migrate a javascript project to typescript')
  .option('--init', 'only initializes the project', false)
  .option(
    '-e, --entrypoint <entrypoint>',
    `path to a entrypoint file inside your project(${process.cwd()})`,
    ''
  )
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
  const basePath = process.cwd();
  const loggerLevel = options.verbose ? 'debug' : 'info';
  const logger = createLogger({
    transports: [new transports.Console({ format: format.cli(), level: loggerLevel })],
  });

  logger.info(`@rehearsal/migrate ${version.trim()}`);

  // Show git warning if:
  // 1. Not --dryRun
  // 2. Not --regen
  // 3. First time run (check if any report exists)
  if (!options.dryRun && !options.regen && !reportExisted(basePath, options.outputPath)) {
    const hasUncommittedFiles = await gitIsRepoDirty(basePath);
    if (hasUncommittedFiles) {
      logger.warn(
        'You have uncommitted files in your repo. Please commit or stash them as Rehearsal will reset your uncommitted changes.'
      );
      process.exit(0);
    }
  }

  // force in project root
  const workspaceRoot = findWorkspaceRoot(basePath);
  if (basePath !== workspaceRoot) {
    logger.warn(
      `migrate command needs to be running at project root with workspaces. 
      Seems like the project root should be ${workspaceRoot} instead of current directory (${basePath}).`
    );
    process.exit(0);
  }

  // ensure entrypoint exists and it is inside basePath
  const relativePath = relative(basePath, options.entrypoint);
  if (
    options.entrypoint &&
    (!relativePath ||
      relativePath.startsWith('..') ||
      isAbsolute(relativePath) ||
      !existsSync(resolve(basePath, relativePath)))
  ) {
    logger.warn(
      `Could not find entrypoint ${resolve(
        basePath,
        relativePath
      )}. Please make sure it is existed and inside your project(${basePath}).`
    );
    process.exit(0);
  }

  const defaultListrOption = {
    concurrent: false,
    exitOnError: true,
  };

  const tasks = [
    await validateTask(basePath, options, logger),
    await initTask(basePath, options),
    await depInstallTask(basePath, options),
    await tsConfigTask(basePath, options),
    await lintConfigTask(basePath, options),
    await createScriptsTask(basePath),
  ];

  try {
    if (options.init) {
      await new Listr(tasks, defaultListrOption).run();
    } else if (options.interactive) {
      // For issue #549, have to use simple renderer for the interactive edit flow
      // previous ctx is needed for the isolated convertTask
      const ctx = await new Listr(tasks, defaultListrOption).run();
      await new Listr([await convertTask(basePath, options, logger, ctx)], {
        renderer: 'simple',
        ...defaultListrOption,
      }).run();
    } else if (options.regen) {
      const tasks = new Listr(
        [await validateTask(basePath, options, logger), await regenTask(basePath, options, logger)],
        defaultListrOption
      );
      await tasks.run();
    } else if (reportExisted(basePath, options.outputPath)) {
      const previousRuns = getPreviousRuns(basePath, options.outputPath, options.entrypoint);
      if (previousRuns.paths.length > 0) {
        logger.info(
          `Existing report(s) detected. Existing report(s) will be regenerated and merged into current report.`
        );
        await new Listr(
          [
            await validateTask(basePath, options, logger),
            await sequentialTask(basePath, options, logger, previousRuns),
          ],
          defaultListrOption
        ).run();
      } else {
        await new Listr(
          [...tasks, await convertTask(basePath, options, logger)],
          defaultListrOption
        ).run();
      }
    } else {
      await new Listr(
        [...tasks, await convertTask(basePath, options, logger)],
        defaultListrOption
      ).run();
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
