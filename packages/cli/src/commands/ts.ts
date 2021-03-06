import * as compareVersions from 'compare-versions';
import debug from 'debug';
import execa = require('execa');
import winston from 'winston';
import { Command } from '@oclif/command';
import { Listr } from 'listr2';
import { resolve } from 'path';

import Reporter from '@rehearsal/reporter';
import { migrate } from '@rehearsal/migrate';

import { reportFormatter } from '../helpers/report';

import {
  build,
  src_dir,
  is_test,
  autofix,
  dry_run,
  tsc_version,
  report_output,
} from '../helpers/flags';

import {
  git,
  determineProjectName,
  getPathToBinary,
  gitCommit,
  isRepoDirty,
  bumpDevDep,
  isYarnManager,
  getLatestTSVersion,
  timestamp,
} from '../utils';

const DEBUG_CALLBACK = debug('rehearsal:ts');
const DEFAULT_TS_BUILD = 'beta';

let TSC_PATH = '';

type Context = {
  tsVersion: string;
  latestELRdBuild: string;
  currentTSVersion: string;
  skip: boolean;
};

export default class TS extends Command {
  static aliases = ['typescript'];
  static description =
    'bump typescript dev-dependency with compilation insights and auto-fix options';
  static flags = {
    build: build({
      default: DEFAULT_TS_BUILD,
    }),
    src_dir: src_dir({
      default: './app',
    }),
    tsc_version: tsc_version(),
    autofix,
    dry_run,
    // hidden flags for testing purposes only
    is_test,
    report_output: report_output({ hidden: true }),
  };

  async run(): Promise<void> {
    const { flags } = this.parse(TS);
    const { build, src_dir } = flags;
    const resolvedSrcDir = resolve(src_dir);

    // WARN: is git dirty check and exit if dirty
    if (!flags.is_test) {
      const { hasUncommittedFiles, uncommittedFilesMessage } = await isRepoDirty(process.cwd());
      if (hasUncommittedFiles) {
        this.warn(uncommittedFilesMessage);
        process.exit(0);
      }
    }

    TSC_PATH = await getPathToBinary('tsc');

    DEBUG_CALLBACK('TSC_PATH', TSC_PATH);
    DEBUG_CALLBACK('flags %O', flags);

    // grab the consuming apps project name
    const projectName = (await determineProjectName()) || '';

    const logger = winston.createLogger({
      transports: [
        new winston.transports.Console({ format: winston.format.cli(), level: 'debug' }),
      ],
    });

    const reporter = new Reporter(projectName, resolvedSrcDir, logger);

    const tasks = new Listr<Context>(
      [
        {
          title: 'Setting TypeScript version for rehearsal',
          task: (_ctx: Context, task): Listr =>
            task.newListr((parent) => [
              {
                title: `Fetching latest published typescript@${build}`,
                exitOnError: true,
                task: async (ctx, task) => {
                  if (!flags.tsc_version) {
                    ctx.latestELRdBuild = await getLatestTSVersion(build);
                    task.title = `Latest typescript@${build} version is ${ctx.latestELRdBuild}`;
                  } else {
                    ctx.latestELRdBuild = flags.tsc_version;
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
                  if (compareVersions.compare(ctx.latestELRdBuild, ctx.currentTSVersion, '>')) {
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
          task: (ctx: Context, task): Listr =>
            task.newListr(() => [
              {
                title: `Bumping TypeScript Dev-Dependency to typescript@${ctx.tsVersion}`,
                task: async (ctx: Context) => {
                  await bumpDevDep(`typescript@${ctx.tsVersion}`);
                },
              },
              {
                title: `Committing Changes`,
                skip: true,
                task: async (ctx: Context) => {
                  if (flags.dry_run || flags.is_test) {
                    task.skip('Skipping task because dry_run flag is set');
                  } else {
                    // eventually commit change
                    const lockFile = (await isYarnManager()) ? 'yarn.lock' : 'package-lock.json';
                    await git(['add', 'package.json', lockFile], process.cwd());

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
          task: (_ctx: Context, task): Listr =>
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
                            if (flags.dry_run) {
                              ctx.skip = true;
                              task.skip('Skipping task because dry_run flag is set');
                            }

                            // do PR work here
                            task.title = `Pull Request Link "https://github.com/foo/foo/pull/00000"`;
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
            const runTransforms = flags.autofix ?? false;

            const result = await migrate({
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
              if (!flags.dry_run && !flags.is_test) {
                await git(['add', `${flags.src_dir}`], process.cwd());
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
      console.log(`Duration:              ${Math.floor(timestamp(true) - startTime)} sec`);

      if (flags.report_output || flags.is_test) {
        reporter.print(resolve(flags.report_output || src_dir, '.rehearsal.json'), reportFormatter);
      }

      // after the reporter closes the stream reset git to the original state
      // need to be careful with this otherwise if a given test fails the git state will be lost
      // be sure to check for is_test flag and only reset within the fixture app and package.json
      // this is reset within the afterEach hook for testing
      if (flags.dry_run && !flags.is_test) {
        await git(['restore', 'package.json', 'yarn.lock', `${flags.src_dir}`], process.cwd());
      }
    } catch (e) {
      this.error(`${e}`);
    }

    return;
  }
}
