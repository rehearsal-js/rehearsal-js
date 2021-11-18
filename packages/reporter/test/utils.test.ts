import { assert } from "chai";
import { suite } from "mocha";
import { resolve } from "path";
import {
  readJSONString,
} from "../src/utils";

import type {
  TSCLog
} from "../src/interfaces"


suite("utils", () => {
  it("readJSONString()", () => {
    const filepath = resolve(__dirname, "./fixtures/rehearsal_report.txt");
    const tscLog = readJSONString<TSCLog>(filepath);
    assert.equal(tscLog[0].autofixedCumulativeErrors, 0);
    assert.equal(tscLog.length, 19);
  });
});



