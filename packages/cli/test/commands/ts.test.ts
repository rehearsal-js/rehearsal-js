import { test } from "@oclif/test";
import { expect } from "chai";

import TS from "../../src/commands/ts";

describe("ts: without flag on throw error", () => {
  test.stderr().it(`runs ts`, async () => {
    try {
      await TS.run(["--is_test"]);
    } catch (error) {
      expect(`${error}`).to.contain(`throw if test`);
    }
  });
});
