import { test } from "@oclif/test";
import { expect, assert } from "chai";
import execa = require("execa");
import { existsSync, readJSONSync, remove } from "fs-extra";
import { join } from "path";
import { resolve } from "path";

import type { Report } from "@rehearsal/reporter";

import TS from "../../src/commands/ts";
import { getPathToBinary } from "../../src/utils";
import { YARN_PATH } from "../test-helpers";
import { git } from "../../src/utils";

const FIXTURE_APP_PATH = resolve(__dirname, "../fixtures/app");
const RESULTS_FILEPATH = join(FIXTURE_APP_PATH, ".rehearsal.json");
let TSC_VERSION = "";

describe("ts:command", async () => {
  test.stderr().it(`on typescript invalid tsc_version`, async () => {
    try {
      await TS.run(["--tsc_version", ""]);
    } catch (error) {
      expect(`${error}`).to.contain(
        `The tsc_version specified is an invalid string. Please specify a valid version as n.n.n`
      );
    }

    try {
      await TS.run(["--tsc_version", "0"]);
    } catch (error) {
      expect(`${error}`).to.contain(
        `The tsc_version specified is an invalid string. Please specify a valid version as n.n.n`
      );
    }
  });

  test.stdout().it(`on typescript version already tested`, async (ctx) => {
    // this will test the version already installed
    await TS.run([
      "--src_dir",
      FIXTURE_APP_PATH,
      "--tsc_version",
      TSC_VERSION,
      "--dry_run",
      "--is_test"
    ]);

    expect(ctx.stdout).to.contain(
      `This application is already on the latest version of TypeScript@${TSC_VERSION}`
    );
  });

  test.stdout().it("with fixture app NO autofix", async (ctx) => {
    await TS.run([
      "--src_dir",
      FIXTURE_APP_PATH,
      "--dry_run",
      "--is_test",
      "--report_output",
      FIXTURE_APP_PATH
    ]);

    expect(ctx.stdout).to.contain(`Autofix not enabled`);
    assert.ok(
      existsSync(RESULTS_FILEPATH),
      `result file ${RESULTS_FILEPATH} should exists`
    );
    const report: Report = readJSONSync(RESULTS_FILEPATH);
    assert.equal(report.projectName, "@rehearsal/cli");
  });

  test.stdout().it("with fixture app WITH autofix", async () => {
    await TS.run([
      "--src_dir",
      FIXTURE_APP_PATH,
      "--dry_run",
      "--is_test",
      "--report_output",
      FIXTURE_APP_PATH,
      "--autofix"
    ]);

    assert.ok(
      existsSync(RESULTS_FILEPATH),
      `result file ${RESULTS_FILEPATH} should exists`
    );
    const report: Report = readJSONSync(RESULTS_FILEPATH);
    assert.equal(report.projectName, "@rehearsal/cli");
    assert.equal(report.fileCount, 3);
  });
})
  .beforeEach(async () => {
    const tscBinary = await getPathToBinary(YARN_PATH, "tsc");
    const { stdout } = await execa(tscBinary, ["--version"]);
    // stdout "Version N.N.N" split at the space
    TSC_VERSION = stdout.split(" ")[1];
  })
  .afterEach(async () => {
    // cleanup and reset
    await remove(join(FIXTURE_APP_PATH, ".rehearsal.json"));
    await git(
      ["restore", "package.json", "../../yarn.lock", FIXTURE_APP_PATH],
      process.cwd()
    );
    await execa(YARN_PATH, [
      "add",
      "-D",
      `typescript@${TSC_VERSION}`,
      "--ignore-scripts"
    ]);
  });
