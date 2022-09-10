#!/usr/bin/env node

import { Reporter } from '@rehearsal/reporter';
import { upgrade } from '@rehearsal/upgrade';
import { Command, InvalidArgumentError } from 'commander';
import { compare } from 'compare-versions';
import { debug } from 'debug';
import { Listr } from 'listr2';
import { resolve } from 'path';
import { createLogger, format, transports } from 'winston';

import execa = require('execa');

import { reportFormatter } from '../helpers/report';
import { UpgradeCommandContext, UpgradeCommandOptions } from '../types';
import {
  bumpDevDep,
  determineProjectName,
  getLatestTSVersion,
  getPathToBinary,
  git,
  gitCheckoutNewLocalBranch,
  gitCommit,
  gitIsRepoDirty,
  isValidSemver,
  isYarnManager,
  timestamp,
} from '../utils';

const DEBUG_CALLBACK = debug('rehearsal:ts');
const DEFAULT_TS_BUILD = 'beta';
const DEFAULT_SRC_DIR = './app';

let TSC_PATH = '';

export const upgradeCommand = new Command();

function validateTscVersion(value: string): string {
  if (isValidSemver(value)) {
    return value;
  } else {
    throw new InvalidArgumentError(
      'The tsc_version specified is an invalid string. Please specify a valid version as n.n.n'
    );
  }
}

upgradeCommand
  .name('upgrade')
  .description('Upgrade typescript dev-dependency with compilation insights and auto-fix options')
  .option('-b, --build <beta|next|latest>', 'typescript build variant', DEFAULT_TS_BUILD)
  .option('-s, --src_dir <src directory>', 'typescript source directory', DEFAULT_SRC_DIR)
  .option('-a, --autofix', 'autofix tsc errors where available')
  .option('-d, --dry_run', 'dry run. dont commit any changes. reporting only')
  .option(
    '-t, --tsc_version <tsc_version>',
    'override the build variant by specifying the typescript compiler version as n.n.n',
    validateTscVersion
  )
  .option('-o, --report_output <output dir>', 'set the directory for the report output')
  .option('-i, --is_test', 'hidden flags for testing purposes only')

  .action(async (options: UpgradeCommandOptions) => {
    const logger = createLogger({
      transports: [new transports.Console({ format: format.cli() })],
    });

    const { build, src_dir, is_test } = options;
    const resolvedSrcDir = resolve(src_dir);

    // WARN: is git dirty check and exit if dirty
    if (!is_test) {
      const hasUncommittedFiles = await gitIsRepoDirty();
      if (hasUncommittedFiles) {
        logger.warn(
          'You have uncommitted files in your repo. Please commit or stash them as Rehearsal will reset your uncommitted changes.'
        );
        process.exit(0);
      }
    }

    TSC_PATH = await getPathToBinary('tsc');

    DEBUG_CALLBACK('TSC_PATH', TSC_PATH);
    DEBUG_CALLBACK('options %O', options);

    // grab the consuming apps project name
    const projectName = (await determineProjectName()) || '';

    const reporter = new Reporter(projectName, resolvedSrcDir, logger);

    const tasks = new Listr<UpgradeCommandContext>(
      [
        {
          title: 'Setting TypeScript version for rehearsal',
          task: (_ctx: UpgradeCommandContext, task): Listr =>
            task.newListr((parent) => [
              {
                title: `Fetching latest published typescript@${build}`,
                exitOnError: true,
                task: async (ctx, task) => {
                  if (!options.tsc_version) {
                    ctx.latestELRdBuild = await getLatestTSVersion(build);
                    task.title = `Latest typescript@${build} version is ${ctx.latestELRdBuild}`;
                  } else {
                    ctx.latestELRdBuild = options.tsc_version;
                    task.title = `Rehearsing with typescript version ${ctx.latestELRdBuild}`;
                  }
                },
              },
              {
                title: 'Fetching installed typescript version',
                task: async (ctx, task) => {
                  const { stdout } = await execa(TSC_PATH, ['--version']);
                  // Version 4.5.0-beta
                  ctx.currentTSVersion = stdout.split(' ')[1];
                  task.title = `Currently on typescript version ${ctx.currentTSVersion}`;
                },
              },
              {
                title: 'Comparing TypeScript versions',
                task: async (ctx) => {
                  if (compare(ctx.latestELRdBuild, ctx.currentTSVersion, '>')) {
                    ctx.tsVersion = ctx.latestELRdBuild;
                    parent.title = `Rehearsing with typescript@${ctx.tsVersion}`;
                    reporter.addSummary('tsVersion', ctx.tsVersion);
                  } else {
                    parent.title = `This application is already on the latest version of TypeScript@${ctx.currentTSVersion}. Exiting.`;
                    // this is a master skip that will skip the remainder of the tasks
                    ctx.skip = true;
                  }
                },
              },
            ]),
        },
        {
          title: `Bumping TypeScript Dev-Dependency`,
          skip: (ctx): boolean => ctx.skip,
          task: (ctx: UpgradeCommandContext, task): Listr =>
            task.newListr(() => [
              {
                title: `Bumping TypeScript Dev-Dependency to typescript@${ctx.tsVersion}`,
                task: async (ctx: UpgradeCommandContext) => {
                  // there will be a diff so branch is created
                  await gitCheckoutNewLocalBranch(`${ctx.tsVersion}`);
                  await bumpDevDep(`typescript@${ctx.tsVersion}`);
                },
              },
              {
                title: `Committing Changes`,
                task: async (ctx: UpgradeCommandContext) => {
                  if (options.dry_run || options.is_test) {
                    task.skip('Skipping task because dry_run flag is set');
                  } else {
                    // eventually commit change
                    const lockFile = (await isYarnManager()) ? 'yarn.lock' : 'package-lock.json';
                    await git.add(['package.json', lockFile]);
                    await gitCommit(
                      `bump typescript from ${ctx.currentTSVersion} to ${ctx.tsVersion}`
                    );
                  }
                },
              },
            ]),
        },
        {
          title: 'Checking for compilation errors',
          skip: (ctx): boolean => ctx.skip,
          task: (_ctx: UpgradeCommandContext, task): Listr =>
            task.newListr(
              () => [
                {
                  title: 'Building TypeScript',
                  task: async (_ctx, task) => {
                    try {
                      await execa(TSC_PATH, ['-b']);

                      // if we should update package.json with typescript version and submit a PR
                      task.newListr(() => [
                        {
                          title: 'Creating Pull Request',
                          task: async (ctx, task) => {
                            if (options.dry_run) {
                              ctx.skip = true;
                              task.skip('Skipping task because dry_run flag is set');
                            }
                            // the diff has been added and commited to the branch
                            // do PR work here and push branch upstream
                            task.title = `Pull-Request Link "https://github.com/foo/foo/pull/00000"`;
                            // on success skip the rest of the tasks
                            ctx.skip = true;
                          },
                        },
                      ]);
                    } catch (error) {
                      // catch the tsc build compliation error
                      // re-run with tsc --clean and try and mitigate the error with ts-migrate plugins
                      throw new Error('Compilation Error');
                    }
                  },
                },
              ],
              { exitOnError: false }
            ),
        },
        {
          title: 'Re-Building TypeScript with Clean',
          skip: (ctx): boolean => ctx.skip,
          task: async () => {
            await execa(TSC_PATH, ['-b', '--clean']);
          },
        },
        {
          title: 'Attempting Autofix',
          skip: (ctx): boolean => ctx.skip,
          task: async (ctx, task) => {
            const runTransforms = options.autofix ?? false;

            // TODO we need to create a PR per diagnostic likely will need to pass git instance to migrate
            const result = await upgrade({
              basePath: resolvedSrcDir,
              configName: 'tsconfig.json', // TODO: Add to command options
              reporter: reporter,
              logger: logger,
            });

            if (result) {
              if (runTransforms) {
                task.title = 'Autofix successful: code changes applied';
              } else {
                task.title = 'Autofix successful: ts-expect-error comments added';
              }

              // commit changes if its not a dry_run and not a test
              if (!options.dry_run && !options.is_test) {
                // add everything to the git repo within the specified src_dir
                await git.add([`${options.src_dir}`]);
                await gitCommit(`fixes tsc type errors with TypeScript@${ctx.tsVersion}`);
              }
            } else {
              throw new Error('Autofix un-successful');
            }
          },
        },
      ],
      { exitOnError: false }
    );

    try {
      const startTime = timestamp(true);
      await tasks.run().then(async (ctx) => {
        DEBUG_CALLBACK('ctx %O', ctx);
      });
      logger.info(`Duration:              ${Math.floor(timestamp(true) - startTime)} sec`);

      if (options.report_output || options.is_test) {
        reporter.print(
          resolve(options.report_output || src_dir, '.rehearsal.json'),
          reportFormatter
        );
      }

      // after the reporter closes the stream reset git to the original state
      // need to be careful with this otherwise if a given test fails the git state will be lost
      // be sure to check for is_test flag and only reset within the fixture app and package.json
      // this is reset within the afterEach hook for testing
      if (options.dry_run && !options.is_test) {
        // await git.reset(['--hard', '--', 'package.json', 'yarn.lock', `${flags.src_dir}`]);
        // await git(['restore', 'package.json', 'yarn.lock', `${flags.src_dir}`], process.cwd());
      }
    } catch (e) {
      logger.error(`${e}`);
    }

    return;
  });
