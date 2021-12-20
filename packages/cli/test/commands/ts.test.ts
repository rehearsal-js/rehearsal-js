import { test } from "@oclif/test";
import { expect, assert } from "chai";
import execa = require("execa");
import { existsSync, readJSONSync } from "fs-extra";
import { join } from "path";

import type { Report } from "@rehearsal/reporter";

import { resolve } from "path";
import TS from "../../src/commands/ts";
import { getPathToBinary } from "../../src/utils";
import { YARN_PATH } from "../test-helpers";

const FIXTURE_APP_PATH = resolve(__dirname, "../fixtures/app");
const RESULTS_FILEPATH = join(FIXTURE_APP_PATH, ".rehearsal.json");

describe("ts:command", () => {
  test.stdout().it(`on typescript version already tested`, async (ctx) => {
    const tscBinary = await getPathToBinary(YARN_PATH, "tsc");
    const { stdout } = await execa(tscBinary, ["--version"]);
    // stdout "Version N.N.N" split at the space
    const tscVersion = stdout.split(" ")[1];
    // this will test the version already installed
    await TS.run([
      "--src_dir",
      FIXTURE_APP_PATH,
      "--tsc_version",
      tscVersion,
      "--dry_run",
      "--is_test"
    ]);

    expect(ctx.stdout).to.contain(
      `This application is already on the latest version of TypeScript@${tscVersion}`
    );
  });

  test.stdout().it(`on fixture app`, async () => {
    await TS.run(["--src_dir", FIXTURE_APP_PATH, "--dry_run", "--is_test"]);

    assert.ok(
      existsSync(RESULTS_FILEPATH),
      `result file ${RESULTS_FILEPATH} should exists`
    );

    const report: Report = readJSONSync(RESULTS_FILEPATH);

    assert.equal(report.projectName, "@rehearsal/cli");
  });
});
