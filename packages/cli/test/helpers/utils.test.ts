import { assert } from "chai";
import { suite } from "mocha";

import {
  normalizeVersionString,
} from "../../src/utils";
import { eachCase } from "../test-helpers";


suite("normalizeVersionString", () => {
  eachCase<typeof normalizeVersionString>(
    [
      {
        args: ["foo-web_10.2.3"] as const,
        expected: "10.2.3",
      },
      {
        args: ["foo-web_10.20.30"] as const,
        expected: "10.20.30",
      },
      {
        args: ["1.2.3"] as const,
        expected: "1.2.3",
      },
    ],
    (args, expected) => {
      assert.deepEqual(normalizeVersionString(...args), expected);
    }
  );
});
