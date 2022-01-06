import { assert } from "chai";
import { suite } from "mocha";
import { dirSync, setGracefulCleanup } from "tmp";
import { join } from "path";
import { existsSync, readJSONSync } from "fs-extra";

import { Reporter } from "../src";

import type {
  TSCLog,
  Report
} from "../src/interfaces";

const TMP_DIR = dirSync().name;
const RESULTS_FILEPATH = join(TMP_DIR, ".rehearsal.json");
const REPORTER = new Reporter({cwd: TMP_DIR});
const PROJECT_NAME = "my super amazing project";
const TSC_VERSION = "0.0.1-dev.20211116";
const ENTRY_FILEPATH = "src/foo.ts";
const ENTRY_ERROR_CODE = "TS1354";

const LOG_ENTRY: TSCLog = {
  filePath: ENTRY_FILEPATH,
  cumulativeErrors: 0,
  uniqueErrors: 0,
  uniqueErrorList: [],
  autofixedCumulativeErrors: 0,
  autofixedErrorList: [],
  errors: [{
    errorCode: ENTRY_ERROR_CODE,
    errorCategory: "error",
    errorMessage: "error message is foo la la",
    helpMessage: "this will help you",
    stringLocation: {
      start: 0,
      end: 0
    }
  }],
};

REPORTER.projectName = PROJECT_NAME;
REPORTER.tscVersion = TSC_VERSION;
REPORTER.terminalLogger.error(`Rehearsal: Your on your own.`);
REPORTER.fileLogger.log("info", "tsc-log-entry", LOG_ENTRY);

suite("reporter", () => {
  it(`runs reporter.end()`, async () => {
    await REPORTER.end();
    assert.ok(
      existsSync(RESULTS_FILEPATH),
      `result file ${RESULTS_FILEPATH} should exists`
    );

    const report: Report = readJSONSync(RESULTS_FILEPATH);

    assert.equal(report.projectName, PROJECT_NAME);
    assert.equal(report.tscVersion, TSC_VERSION);
    assert.equal(report.tscLog[0].filePath, ENTRY_FILEPATH);
    assert.deepEqual(report.uniqueErrorList, [ENTRY_ERROR_CODE]);
    assert.equal(report.uniqueErrors, 1);
    assert.equal(report.cumulativeErrors, 1);
    assert.equal(report.fileCount, 1);
  });
}).afterEach(() => {
  setGracefulCleanup();
});
