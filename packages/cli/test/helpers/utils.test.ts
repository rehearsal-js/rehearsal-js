import { assert, expect } from "chai";
import { suite } from "mocha";

import execa = require("execa");

import {
  normalizeVersionString,
  determineProjectName,
  timestamp,
  getPathToBinary,
  isYarnManager,
  sleep
} from "../../src/utils";
import { eachCase } from "../test-helpers";

suite("utils", () => {
  it("normalizeVersionString", async () => {
    eachCase<typeof normalizeVersionString>(
      [
        {
          args: ["foo-web_10.2.3"] as const,
          expected: "10.2.3"
        },
        {
          args: ["foo-web_10.20.30"] as const,
          expected: "10.20.30"
        },
        {
          args: ["1.2.3"] as const,
          expected: "1.2.3"
        }
      ],
      (args, expected) => {
        assert.deepEqual(normalizeVersionString(...args), expected);
      }
    );
  });

  it("determineProjectName()", async () => {
    const projectName = await determineProjectName();
    assert.equal(projectName, "@rehearsal/cli");
  });

  it("timestamp(true)", async () => {
    const start = timestamp(true);
    await sleep(1000);
    const end = timestamp(true);
    assert.equal(`${start}`.split(".").length, 2);
    expect(end).to.be.greaterThan(start);
  });

  it("getPathToBinary()", async () => {
    const tscPath = await getPathToBinary("tsc");
    const { stdout } = await execa(tscPath, ["--version"]);

    expect(stdout).to.contain(`Version`);
  });

  // @rehearsal/cli uses yarn
  it("isYarnManager()", async () => {
    const isYarn = await isYarnManager();

    assert.equal(isYarn, true);
  });
});
