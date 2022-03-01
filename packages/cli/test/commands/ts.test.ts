import { test } from "@oclif/test";
import { describe } from "mocha";
import { expect, assert } from "chai";
import execa = require("execa");
import { existsSync, readJSONSync } from "fs-extra";
import { join, resolve } from "path";

import type { Report } from "@rehearsal/reporter";

import { restoreLocalGit, YARN_PATH } from "../test-helpers";
import { TS } from "../../src";

const FIXTURE_APP_PATH = resolve(__dirname, "../fixtures/app");
const RESULTS_FILEPATH = join(FIXTURE_APP_PATH, ".rehearsal.json");
const TEST_TSC_VERSION = "4.2.4";

const beforeSetup = async () => {
  // install the test version of tsc
  await execa(YARN_PATH, [
    "add",
    "-D",
    `typescript@${TEST_TSC_VERSION}`,
    "--ignore-scripts"
  ]);
};

const afterEachCleanup = async () => {
  await restoreLocalGit(FIXTURE_APP_PATH);
  await execa(YARN_PATH, [
    "add",
    "-D",
    `typescript@${TEST_TSC_VERSION}`,
    "--ignore-scripts"
  ]);
  await execa(YARN_PATH, ["install"]);
};

describe("ts:command against fixture", async () => {
  before(beforeSetup);

  test.stdout().it("WITH autofix", async (ctx) => {
    await TS.run([
      "--src_dir",
      FIXTURE_APP_PATH,
      "--dry_run",
      "--is_test",
      "--report_output",
      FIXTURE_APP_PATH,
      "--autofix"
    ]);

    expect(ctx.stdout).to.contain(`Rehearsing with typescript@`);
    expect(ctx.stdout).to.contain(`Autofix successful: code changes applied`);
    assert.ok(
      existsSync(RESULTS_FILEPATH),
      `result file ${RESULTS_FILEPATH} should exists`
    );
    const report: Report = readJSONSync(RESULTS_FILEPATH);
    const firstFileReportError = report.tscLog[0].errors[0];
    assert.equal(report.projectName, "@rehearsal/cli");
    assert.equal(report.fileCount, 3);
    assert.equal(report.cumulativeErrors, 21);
    assert.equal(report.uniqueErrors, 1);
    assert.equal(report.autofixedErrors, 21);
    assert.equal(report.autofixedUniqueErrorList[0], "6133");
    assert.equal(report.uniqueErrorList[0], "6133");
    assert.equal(report.tscLog.length, 3);
    assert.equal(
      firstFileReportError.errorMessage,
      " @ts-expect-error ts-migrate(6133) FIXED: 'git' is declared but its value is never read."
    );
    assert.equal(
      firstFileReportError.helpMessage,
      "The declaration 'git' is never read. Remove the declaration or use it."
    );
    assert.equal(firstFileReportError.errorCode, "6133");
    assert.equal(firstFileReportError.isAutofixed, true);
    assert.equal(firstFileReportError.stringLocation.end, 328);
    assert.equal(firstFileReportError.stringLocation.start, 238);
  });

  test.stdout().it("NO autofix", async (ctx) => {
    await TS.run([
      "--src_dir",
      FIXTURE_APP_PATH,
      "--dry_run",
      "--is_test",
      "--report_output",
      FIXTURE_APP_PATH
    ]);

    expect(ctx.stdout).to.contain(`Autofix successful: ts-expect-error comments added`);
  });
}).afterEach(afterEachCleanup);

describe("ts:command tsc version check", async () => {
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
    // the test sandbox should have an older version of tsc installed
    // during the afterEachCleanup() phase
    await TS.run([
      "--src_dir",
      FIXTURE_APP_PATH,
      "--tsc_version",
      TEST_TSC_VERSION,
      "--dry_run",
      "--is_test"
    ]);

    expect(ctx.stdout).to.contain(
      `This application is already on the latest version of TypeScript@${TEST_TSC_VERSION}`
    );
  });
}).afterEach(afterEachCleanup);
