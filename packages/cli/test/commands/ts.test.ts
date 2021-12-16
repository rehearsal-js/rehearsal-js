import { test } from "@oclif/test";
import { expect } from "chai";
import execa = require("execa");

import { resolve } from "path";
import TS from "../../src/commands/ts";
import { getPathToBinary } from "../../src/utils";
import { YARN_PATH } from "../test-helpers";

const FIXTURE_APP_PATH = resolve(__dirname, "../fixtures/app");

describe("ts:command", () => {
  test.stderr().it(`on test arg throw error`, async () => {
    try {
      await TS.run(["--is_test"]);
    } catch (error) {
      expect(`${error}`).to.contain(`throw if test`);
    }
  });

  test.stdout().it(`on typescript version already tested`, async (ctx) => {
    const tscBinary = await getPathToBinary(YARN_PATH, "tsc");
    const { stdout } = await execa(tscBinary, ["--version"]);
    // stdout "Version N.N.N" split at the space
    const tscVersion = stdout.split(" ")[1];
    // this will test the version already installed
    await TS.run(["--src_dir", FIXTURE_APP_PATH, "--tsc_version", tscVersion]);

    expect(ctx.stdout).to.contain(
      `This application is already on TypeScript@${tscVersion}`
    );
  });

  // test.stdout().it(`on fixture app full feature`, async (ctx) => {
  //   await TS.run(["--src_dir", FIXTURE_APP_PATH, "--auto_fix", "--update_dep"]);
  //   expect(ctx.stdout).to.contain(`JSON:`);
  // });
});
