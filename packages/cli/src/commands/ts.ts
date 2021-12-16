import { Command } from "@oclif/command";
import * as compareVersions from "compare-versions";
import { Listr } from "listr2";
import { resolve } from "path";
import { Reporter } from "@rehearsal/reporter";
import debug from "debug";
import execa = require("execa");

import { tsMigrateAutofix } from "../ts-migrate";
import {
  build,
  src_dir,
  is_test,
  autofix,
  update_dep,
  tsc_version,
} from "../helpers/flags";
import { git, timestamp } from "../utils";

const DEBUG_CALLBACK = debug("rehearsal:ts");
const DEFAULT_TS_BUILD = "beta";
const TSC_PATH = resolve("./node_modules/.bin/tsc");
const TS_MIGRATE_PATH = resolve("./node_modules/.bin/ts-migrate");

const { VOLTA_HOME } = process.env as { VOLTA_HOME: string };
const YARN_PATH = resolve(VOLTA_HOME, "bin/yarn");
const NPM_PATH = resolve(VOLTA_HOME, "bin/npm");

DEBUG_CALLBACK("paths %O", { VOLTA_HOME, YARN_PATH, NPM_PATH });

// TODO remove cwd for development only
const REPORTER = new Reporter({ cwd: process.cwd() });

type Context = {
  tsVersion: string;
  latestELRdBuild: string;
  currentTSVersion: string;
};

export default class TS extends Command {
  static aliases = ["typescript"];
  static description =
    "bump typescript dev-dependency with compilation insights and auto-fix options";
  static flags = {
    build: build({
      default: DEFAULT_TS_BUILD,
    }),
    src_dir: src_dir({
      default: "./app",
    }),
    tsc_version: tsc_version(),
    autofix,
    update_dep,
    // hidden flags for testing purposes only
    is_test,
  };

  async run(): Promise<void> {
    const { flags } = this.parse(TS);
    const { build, src_dir } = flags;
    const resolvedSrcDir = resolve(src_dir);

    if (flags.is_test) {
      // do some stuff for tests
      this.error("throw if test");
    }

    DEBUG_CALLBACK("flags %O", flags);

    // oclif already parses the package.json of the consuming app
    REPORTER.projectName = this.config.pjson.name;

    const tasks = new Listr<Context>([
      {
        title: "Setting TypeScript version for rehearsal",
        task: (_ctx: Context, task): Listr =>
          task.newListr((parent) => [
            {
              title: `Fetching latest published typescript@${build}`,
              task: async (ctx, task) => {
                if (!flags.tsc_version) {
                  const { stdout } = await execa(NPM_PATH, [
                    "show",
                    `typescript@${build}`,
                    "version",
                  ]);

                  ctx.latestELRdBuild = stdout;
                  task.title = `Latest typescript@${build} version is ${ctx.latestELRdBuild}`;
                } else {
                  ctx.latestELRdBuild = flags.tsc_version;
                  task.title = `Rehearsing with typescript version ${ctx.latestELRdBuild}`;
                }
              },
            },
            {
              title: "Fetching installed typescript version",
              task: async (ctx, task) => {
                const { stdout } = await execa(TSC_PATH, ["--version"]);
                // Version 4.5.0-beta
                ctx.currentTSVersion = stdout.split(" ")[1];
                task.title = `Currently on typescript version ${ctx.currentTSVersion}`;
              },
            },
            {
              title: "Comparing TypeScript versions",
              task: async (ctx) => {
                if (
                  compareVersions.compare(
                    ctx.latestELRdBuild,
                    ctx.currentTSVersion,
                    ">"
                  )
                ) {
                  ctx.tsVersion = ctx.latestELRdBuild;
                  parent.title = `Rehearsing with typescript@${ctx.tsVersion}`;
                  REPORTER.tscVersion = ctx.tsVersion;
                } else {
                  parent.title = `This version of typescript has already been tested. Exiting.`;
                  // successful exit
                  process.exit(0);
                }
              },
            },
          ]),
      },
      {
        title: `Bumping TypeScript Dev-Dependency`,
        task: (ctx: Context, task): Listr =>
          task.newListr(() => [
            {
              title: `Bumping TypeScript Dev-Dependency to typescript@${ctx.tsVersion}`,
              task: async (ctx: Context) => {
                await execa(YARN_PATH, [
                  "add",
                  "-D",
                  `typescript@${ctx.tsVersion}`,
                  "--ignore-scripts",
                ]);
              },
            },
            {
              title: `Adding and Committing Change`,
              skip: true,
              task: async (ctx: Context) => {
                // eventually commit change
                // add package.json and yarn.lock (assumes yarn)
                await git(["add", "package.json", "yarn.lock"], process.cwd());
                // commit with Rehearsal prefix
                await git(
                  [
                    "commit",
                    "-m",
                    `chore(deps-dev): [REHEARSAL-BOT] bump typescript from ${ctx.currentTSVersion} to ${ctx.tsVersion}`,
                  ],
                  process.cwd()
                );
              },
            },
          ]),
      },
      {
        title: "Checking for compilation errors",
        task: (_ctx: Context, task): Listr =>
          task.newListr(
            () => [
              {
                title: "Building TypeScript",
                task: async (_ctx, task) => {
                  try {
                    await execa(TSC_PATH, ["-b"]);

                    // if we should update package.json with typescript version and submit a PR
                    task.newListr(() => [
                      {
                        title: "Creating Pull Request",
                        task: async (_ctx, task) => {
                          if (!flags.update_dep) {
                            task.skip("update_dep flag not set");
                          }

                          // do PR work here
                          task.title = `Pull Request Link "https://github.com/foo/foo/pull/00000"`;
                          // successful exit
                          process.exit(0);
                        },
                      },
                    ]);
                  } catch (error) {
                    throw new Error("Compilation Error");
                  }
                },
              },
            ],
            { exitOnError: false }
          ),
      },
      {
        title: "Re-Building TypeScript with Clean",
        task: async () => {
          await execa(TSC_PATH, ["-b", "--clean"]);
        },
      },
      {
        title: "Running TS-Migrate Reignore",
        task: async () => {
          // this will add the @ts-expect-error and error-code for compiliation errors
          await execa(TS_MIGRATE_PATH, ["reignore", resolvedSrcDir]);
        },
      },
      {
        title: "Attempting Autofix",
        task: async (_ctx, task) => {
          if (!flags.autofix) {
            task.skip("Autofix not enabled");
          }
          const exitCode = await tsMigrateAutofix(resolvedSrcDir, REPORTER);
          if (exitCode === 0) {
            task.title = "Autofix successful";
          } else {
            throw new Error("Autofix un-successful");
          }

          return;
        },
      },
    ]);

    try {
      const startTime = timestamp(true);
      await tasks.run().then(async (ctx) => {
        DEBUG_CALLBACK("ctx %O", ctx);
      });

      this.log(
        `\nRehearsal Duration: ${Math.floor(
          timestamp(true) - startTime
        )} seconds`
      );
      // end the reporter stream
      // and parse the results into a json file
      await REPORTER.end();
    } catch (e) {
      this.error(`${e}`);
    }

    return;
  }
}
