import { assert, expect } from "chai";
import { suite, test } from "mocha";
import { inspect } from "util";
import {
  msToSeconds,
  normalizeVersionString,
  parseLongDescribe,
  sleep,
} from "../../src/utils";


type ArgsOf<T extends (...args: readonly unknown[]) => unknown> = T extends (
  ...args: infer Args
) => unknown
  ? Readonly<Args>
  : never;

type TestCaseCallback<Args extends readonly unknown[], Result> = (
  args: Args,
  expected: Result
) => void;

interface TestCase<Args, Result> {
  args: Args;
  expected: Result;
}

function eachCase<
  T extends (...args: readonly any[]) => any,
  Args extends readonly unknown[] = ArgsOf<T>,
  Result = ReturnType<T>
>(
  cases: TestCase<Args, Result>[],
  callback: TestCaseCallback<Args, Result>
): void {
  cases.forEach(({ args, expected }) => {
    test(inspect(args, { compact: true }), () => {
      callback(args, expected);
    });
  });
}

suite("utils", () => {
  it("msToSeconds()", () => {
    const sec = msToSeconds(20000);
    assert.equal(sec, 20);
  });
  it("sleep()", async () => {
    const startTime = Math.floor(new Date().getTime() / 1000);
    await sleep(2000);
    const endTime = Math.floor(new Date().getTime() / 1000);
    const durationInSec = endTime - startTime;
    expect(durationInSec).to.be.at.least(2);
  });
  suite("parseLongDescribe()", () => {
    eachCase<typeof parseLongDescribe>(
      [
        {
          args: ["voyager-web_1.3.1146-1-ge12aab0a715-dirty"],
          expected: {
            tag: "voyager-web_1.3.1146",
            count: 1,
            sha: "e12aab0a715",
            dirty: true,
          },
        },
        {
          args: ["pemberly-example-web_0.1.394-0-g0c75977"],
          expected: {
            tag: "pemberly-example-web_0.1.394",
            count: 0,
            sha: "0c75977",
            dirty: false,
          },
        },
      ],
      (args, expected) => {
        assert.deepEqual(parseLongDescribe(...args), expected);
      }
    );
  });

  suite("normalizeVersionString()", () => {
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
});

