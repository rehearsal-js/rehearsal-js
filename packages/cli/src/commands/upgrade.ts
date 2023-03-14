#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';
import { compare } from 'compare-versions';
import debug from 'debug';
import { Listr } from 'listr2';
import { createLogger, format, transports } from 'winston';
import { execa } from 'execa';
import {
  addDep,
  determineProjectName,
  getLatestTSVersion,
  getLockfilePath,
  getPathToBinary,
  git,
  gitCheckoutNewLocalBranch,
  gitCommit,
  gitIsRepoDirty,
  parseCommaSeparatedList,
  parseTsVersion,
} from '@rehearsal/utils';

import { PackageJson, UpgradeCommandContext, UpgradeCommandOptions } from '../types.js';

const __dirname = new URL('.', import.meta.url).pathname;
const { version } = PackageJson.parse(
  JSON.parse(await fs.readFile(resolve(__dirname, '../../package.json'), 'utf-8'))
);

const DEBUG_CALLBACK = debug('rehearsal:upgrade');
export const upgradeCommand = new Command();

//TODO: add entrypoint option
upgradeCommand
  .name('upgrade')
  .description('Upgrade typescript dev-dependency with compilation insights and auto-fix options')
  .argument('[basePath]', 'Path to directory contains tsconfig.json', '.')
  .option('-b, --build <latestBeta|beta|next|latest|rc>', 'typescript build variant', 'latestBeta')
  .option(
    '-t, --tsVersion <tsVersion>',
    'override the build variant by specifying the typescript compiler version as n.n.n',
    parseTsVersion
  )
  .option('-o, --outputPath <outputPath>', 'Reports output path', '.rehearsal')
  .option(
    '-f, --format <format>',
    'Report format separated by comma, e.g. -f json,sarif,md,sonarqube',
    parseCommaSeparatedList,
    ['sarif']
  )
  .option('-d, --dryRun', `Don't commit any changes`, false)

  .action(async (basePath: string, options: UpgradeCommandOptions) => {
    const logger = createLogger({
      transports: [new transports.Console({ format: format.cli() })],
    });

    // We lazily load these modules because the commands are eagerly loaded and we may
    // or may not have installed typescript yet
    const Reporter = await import('@rehearsal/reporter').then((m) => m.Reporter);
    const upgrade = await import('@rehearsal/upgrade').then((m) => m.upgrade);

    basePath = resolve(basePath);

    console.log(`@rehearsal/upgrade ${version?.trim()}`);

    // WARN: is git dirty check and exit if dirty
    if (!options.dryRun) {
      const hasUncommittedFiles = await gitIsRepoDirty();
      if (hasUncommittedFiles) {
        logger.warn(
          'You have uncommitted files in your repo. Please commit or stash them as Rehearsal will reset your uncommitted changes.'
        );
      }
    }

    const tscPath = await getPathToBinary('tsc');

    DEBUG_CALLBACK('tscPath: %O', tscPath);
    DEBUG_CALLBACK('options: %O', options);

    // grab the consuming apps project name
    const projectName = determineProjectName() || '';

    const reporter = new Reporter(
      { tsVersion: '', projectName, basePath, commandName: '@rehearsal/upgrade' },
      logger
    );

    const tasks = new Listr<UpgradeCommandContext>(
      [
        {
          title: 'Setting TypeScript version for rehearsal',
          task: (_ctx: UpgradeCommandContext, task) =>
            task.newListr((parent) => [
              {
                title: options.tsVersion
                  ? `Fetching typescript@${options.tsVersion}`
                  : `Fetching latest published typescript@${options.build}`,
                exitOnError: true,
                task: async (ctx, task) => {
                  if (!options.tsVersion) {
                    ctx.latestAvailableBuild = await getLatestTSVersion(options.build);
                    task.title = `Latest typescript@${options.build} version is ${ctx.latestAvailableBuild}`;
                  } else {
                    ctx.latestAvailableBuild = options.tsVersion;
                    task.title = `Rehearsing with typescript@${ctx.latestAvailableBuild}`;
                  }
                },
              },
              {
                title: 'Fetching installed typescript version',
                task: async (ctx, task) => {
                  const { stdout } = await execa(tscPath, ['--version']);
                  // Version 4.5.0-beta
                  ctx.currentTSVersion = stdout.split(' ')[1];
                  task.title = `Currently on typescript version ${ctx.currentTSVersion}`;
                },
              },
              {
                title: 'Comparing TypeScript versions',
                task: (ctx) => {
                  if (compare(ctx.latestAvailableBuild, ctx.currentTSVersion, '>')) {
                    ctx.tsVersion = ctx.latestAvailableBuild;
                    parent.title = `Rehearsing with typescript@${ctx.tsVersion}`;
                    reporter.addToRunSummary('tsVersion', ctx.tsVersion);
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
          task: (ctx: UpgradeCommandContext, task) =>
            task.newListr(() => [
              {
                title: `Bumping TypeScript Dev-Dependency to typescript@${ctx.tsVersion}`,
                task: async (ctx: UpgradeCommandContext) => {
                  if (!options.dryRun) {
                    // there will be a diff so branch is created
                    await gitCheckoutNewLocalBranch(`${ctx.tsVersion}`);
                  }
                  await addDep([`typescript@${ctx.tsVersion}`], true);
                  reporter.addToRunSummary('tsVersion', ctx.tsVersion);
                },
              },
              {
                title: `Committing Changes`,
                task: async (ctx: UpgradeCommandContext) => {
                  if (options.dryRun) {
                    task.skip('Skipping task because dryRun flag is set');
                  } else {
                    // eventually commit change
                    const lockFile = getLockfilePath() || '';
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
          task: (_ctx: UpgradeCommandContext, task) =>
            task.newListr(
              () => [
                {
                  title: 'Building TypeScript',
                  task: async (_ctx, task) => {
                    try {
                      await execa(tscPath, ['-b']);

                      // if we should update package.json with typescript version and submit a PR
                      task.newListr(() => [
                        {
                          title: 'Creating Pull Request',
                          task: (ctx, task) => {
                            if (options.dryRun) {
                              ctx.skip = true;
                              task.skip('Skipping task because dryRun flag is set');
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
            await execa(tscPath, ['-b', '--clean']);
          },
        },
        {
          title: 'Fixing the source code',
          skip: (ctx): boolean => ctx.skip,
          task: async (ctx, task) => {
            const configName = 'tsconfig.json';

            await upgrade({ basePath, entrypoint: '', configName, reporter, logger });

            // TODO: Check if code actually been fixed
            task.title = 'Codefixes applied successfully';

            if (!options.dryRun) {
              DEBUG_CALLBACK('Committing changes');
              // add everything to the git repo within the specified src_dir
              await git.add([`${basePath}`]);
              await gitCommit(`fix: fixes tsc type errors with TypeScript@${ctx.tsVersion}`);
            }
          },
        },
      ],
      { exitOnError: false }
    );

    try {
      await tasks.run().then((ctx) => {
        DEBUG_CALLBACK('ctx: %O', ctx);
      });

      const generateReports = await import('../helpers/report.js').then((m) => m.generateReports);

      const reportOutputPath = resolve(basePath, options.outputPath);
      generateReports('upgrade', reporter, reportOutputPath, options.format);
    } catch (e) {
      if (e instanceof Error) {
        logger.error(`${e.message + '\n' + (e.stack || '')}`);
      }
    }

    return;
  });
