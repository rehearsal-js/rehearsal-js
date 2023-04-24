#!/usr/bin/env node
import { isAbsolute, relative, resolve } from 'node:path';
import { existsSync, promises as fs } from 'node:fs';
import { Command, Option } from 'commander';
import { Listr } from 'listr2';
import { createLogger, format, transports } from 'winston';
import { findWorkspaceRoot, gitIsRepoDirty, parseCommaSeparatedList } from '@rehearsal/utils';
import { PackageJson } from 'type-fest';
import { FixCommandContext, FixCommandOptions, PreviousRuns } from '../../types.js';

// eslint-disable-next-line no-restricted-imports
import type { Report } from '@rehearsal/reporter';

const __dirname = new URL('.', import.meta.url).pathname;
const { version } = JSON.parse(
  await fs.readFile(resolve(__dirname, '../../../package.json'), 'utf-8')
) as PackageJson;

export const fixCommand = new Command();

fixCommand
  .alias('infer')
  .name('fix')
  .description('provides type inference against typescript projects')
  .addOption(
    new Option('-b, --basePath <project base path>', 'base directory of your project')
      .default(process.cwd())
      // use argParser to ensure process.cwd() is basePath
      // even use passes anything accidentally
      .argParser(() => process.cwd())
      .hideHelp()
  )
  .option(
    '-e, --entrypoint <entrypoint>',
    `path to a entrypoint file inside your project(${process.cwd()})`,
    ''
  )
  .option(
    '-p, --package <relative path to target package>',
    `run migrate against a specific child-package in your project(${process.cwd()}) `,
    ''
  )
  .option(
    '-f, --format <format>',
    'report format separated by comma, e.g. -f json,sarif,md,sonarqube',
    parseCommaSeparatedList,
    ['sarif']
  )
  .option('-o, --outputPath <outputPath>', 'reports output directory', '.rehearsal')
  .option('--ci', 'non-interactive mode')
  .option('-v, --verbose', 'print debugging logs')
  .option('-d, --dryRun', 'print files that will be attempted to migrate', false)
  .option('-r, --regen', 'print out current migration status')
  .action(async (options: FixCommandOptions) => {
    await migrate(options);
  });

async function migrate(options: FixCommandOptions): Promise<void> {
  const loggerLevel = options.verbose ? 'debug' : 'info';
  const logger = createLogger({
    transports: [new transports.Console({ format: format.cli(), level: loggerLevel })],
  });

  const {
    validateTask,
    initTask,
    depInstallTask,
    tsConfigTask,
    lintConfigTask,
    createScriptsTask,
    analyzeTask,
    convertTask,
    regenTask,
    reportExisted,
  } = await loadTasks();

  logger.info(`@rehearsal/fix ${version?.trim()}`);

  // Show git warning if:
  // 1. Not --dryRun
  // 2. Not --regen
  // 3. First time run (check if any report exists)
  if (!options.dryRun && !options.regen && !reportExisted(options.basePath, options.outputPath)) {
    const hasUncommittedFiles = await gitIsRepoDirty(options.basePath);
    if (hasUncommittedFiles) {
      logger.warn(
        'You have uncommitted files in your repo. You might want to commit or stash them.'
      );
    }
  }

  // force in project root
  const workspaceRoot = findWorkspaceRoot(options.basePath);
  if (options.basePath !== workspaceRoot) {
    logger.warn(
      `migrate command needs to be running at project root with workspaces.
        Seems like the project root should be ${workspaceRoot} instead of current directory (${options.basePath}).`
    );
    process.exit(0);
  }

  // ensure entrypoint exists and it is inside options.basePath
  const relativePath = relative(options.basePath, options.entrypoint);
  if (
    options.entrypoint &&
    (!relativePath ||
      relativePath.startsWith('..') ||
      isAbsolute(relativePath) ||
      !existsSync(resolve(options.basePath, relativePath)))
  ) {
    logger.warn(
      `Could not find entrypoint ${resolve(
        options.basePath,
        relativePath
      )}. Please make sure it is existed and inside your project(${options.basePath}).`
    );
    process.exit(0);
  }

  const defaultListrOption = {
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
    analyzeTask(options),
  ];

  try {
    if (!options.ci) {
      // For issue #549, have to use simple renderer for the interactive edit flow
      // previous ctx is needed for the isolated convertTask
      const ctx = await new Listr<FixCommandContext>(tasks, defaultListrOption).run();
      await new Listr([convertTask(options, logger, ctx)], {
        renderer: 'simple',
        ...defaultListrOption,
      }).run();
    } else if (options.regen) {
      const tasks = new Listr(
        [validateTask(options, logger), regenTask(options, logger)],
        defaultListrOption
      );
      await tasks.run();
    } else if (options.skipInit) {
      await new Listr(
        [
          validateTask(options, logger),
          initTask(options),
          analyzeTask(options),
          convertTask(options, logger),
        ],
        defaultListrOption
      ).run();
    } else if (reportExisted(options.basePath, options.outputPath)) {
      const previousRuns = await getPreviousRuns(
        options.basePath,
        options.outputPath,
        options.entrypoint
      );
      if (previousRuns.paths.length > 0) {
        logger.info(
          `Existing report(s) detected. Existing report(s) will be regenerated and merged into current report.`
        );
        await new Listr(
          [validateTask(options, logger), sequentialTask(options, logger, previousRuns)],
          defaultListrOption
        ).run();
      } else {
        await new Listr([...tasks, convertTask(options, logger)], defaultListrOption).run();
      }
    } else {
      await new Listr([...tasks, convertTask(options, logger)], defaultListrOption).run();
    }
  } catch (e) {
    if (e instanceof Error) {
      logger.error(`${e.message + '\n' + (e.stack || '')}`);
    }
  }
}

async function getPreviousRuns(
  basePath: string,
  outputDir: string,
  entrypoint: string
): Promise<PreviousRuns> {
  const jsonReportPath = resolve(basePath, outputDir, 'migrate-report.json');

  let previousRuns: PreviousRuns = { paths: [], previousFixedCount: 0 };

  if (existsSync(jsonReportPath)) {
    const report = JSON.parse(await fs.readFile(jsonReportPath, 'utf-8')) as Report;
    const { summary = [], fixedItemCount: previousFixedCount = 0 } = report;
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

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function loadTasks() {
  return await import('./tasks/index.js').then((m) => {
    const {
      initTask,
      analyzeTask,
      depInstallTask,
      convertTask,
      tsConfigTask,
      lintConfigTask,
      createScriptsTask,
      regenTask,
      validateTask,
      reportExisted,
    } = m;

    return {
      initTask,
      analyzeTask,
      depInstallTask,
      convertTask,
      tsConfigTask,
      lintConfigTask,
      createScriptsTask,
      regenTask,
      validateTask,
      reportExisted,
    };
  });
}
