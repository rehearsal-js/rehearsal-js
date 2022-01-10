import { test } from "@oclif/test";
import { expect, assert } from "chai";
import execa = require("execa");
import { existsSync, readJSONSync, remove } from "fs-extra";
import { join } from "path";
import { resolve } from "path";

import type { Report } from "@rehearsal/reporter";

import { TSC } from "../../src";
import { YARN_PATH } from "../test-helpers";
import { git } from "../../src/utils";

const FIXTURE_APP_PATH = resolve(__dirname, "../fixtures/app");
const RESULTS_FILEPATH = join(FIXTURE_APP_PATH, ".rehearsal.json");
// we need an older version of typescript that'll flag errors
let TSC_VERSION = "4.2.4";

const beforeEachDefault = async () => {
  await execa(YARN_PATH, [
    "add",
    "-D",
    `typescript@${TSC_VERSION}`,
    "--ignore-scripts"
  ]);
};

const afterEachCleanup = async () => {
  await remove(join(FIXTURE_APP_PATH, ".rehearsal.json"));
  await git(
    ["restore", "package.json", "../../yarn.lock", FIXTURE_APP_PATH],
    process.cwd()
  );
};

describe("ts:command against fixture", async () => {
  test.stdout().it("WITH autofix", async (ctx) => {
    await TSC.run([
      "--src_dir",
      FIXTURE_APP_PATH,
      "--dry_run",
      "--is_test",
      "--report_output",
      FIXTURE_APP_PATH,
      "--autofix"
    ]);

    expect(ctx.stdout).to.contain(`Rehearsing with typescript@`);
    expect(ctx.stdout).to.contain(`Running TS-Migrate Reignore`);
    expect(ctx.stdout).to.contain(`Autofix successful`);
    assert.ok(
      existsSync(RESULTS_FILEPATH),
      `result file ${RESULTS_FILEPATH} should exists`
    );
    const report: Report = readJSONSync(RESULTS_FILEPATH);
    const firstFileReportError = report.tscLog[0].errors[0];
    assert.equal(report.projectName, "@rehearsal/cli");
    assert.equal(report.fileCount, 3);
    assert.equal(report.cumulativeErrors, 21);
    assert.equal(report.uniqueCumulativeErrors, 1);
    assert.equal(report.autofixedCumulativeErrors, 1);
    assert.equal(report.autofixedUniqueErrorList[0], "6133");
    assert.equal(report.uniqueErrorList[0], "6133");
    assert.equal(report.tscLog.length, 3);
    assert.equal(
      firstFileReportError.errorMessage,
      " @ts-expect-error ts-migrate(6133) FIXED: 'git' is declared but its value is never read."
    );
    assert.equal(
      firstFileReportError.helpMessage,
      "'string' is declared but its value is never read."
    );
    assert.equal(firstFileReportError.errorCode, "6133");
    assert.equal(firstFileReportError.isAutofixed, true);
    assert.equal(firstFileReportError.stringLocation.end, 326);
    assert.equal(firstFileReportError.stringLocation.start, 236);

    test.stdout().it("NO autofix", async (ctx) => {
      await TSC.run([
        "--src_dir",
        FIXTURE_APP_PATH,
        "--dry_run",
        "--is_test",
        "--report_output",
        FIXTURE_APP_PATH
      ]);

      expect(ctx.stdout).to.contain(`Autofix not enabled`);
    });
  });
})
  .beforeEach(async () => {
    await beforeEachDefault();
  })
  .afterEach(async () => {
    // cleanup and reset
    await afterEachCleanup();
  });

describe("ts:command tsc version check", async () => {
  test.stderr().it(`on typescript invalid tsc_version`, async () => {
    try {
      await TSC.run(["--tsc_version", ""]);
    } catch (error) {
      expect(`${error}`).to.contain(
        `The tsc_version specified is an invalid string. Please specify a valid version as n.n.n`
      );
    }

    try {
      await TSC.run(["--tsc_version", "0"]);
    } catch (error) {
      expect(`${error}`).to.contain(
        `The tsc_version specified is an invalid string. Please specify a valid version as n.n.n`
      );
    }
  });

  test.stdout().it(`on typescript version already tested`, async (ctx) => {
    // this will test the version already installed
    await TSC.run([
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
})
  .beforeEach(async () => {
    await beforeEachDefault();
  })
  .afterEach(async () => {
    // cleanup and reset
    await afterEachCleanup();
  });
