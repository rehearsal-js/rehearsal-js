import { inspect } from 'util';
import { test } from 'mocha';
import { join, resolve } from 'path';
import { remove } from 'fs-extra';

import { git } from '../src';

type ArgsOf<T extends (...args: readonly unknown[]) => unknown> = T extends (
  // tslint:disable-next-line: no-unused
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

export function eachCase<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends (...args: readonly any[]) => any,
  Args extends readonly unknown[] = ArgsOf<T>,
  Result = ReturnType<T>
>(cases: TestCase<Args, Result>[], callback: TestCaseCallback<Args, Result>): void {
  cases.forEach(({ args, expected }) => {
    test(inspect(args, { compact: true }), () => {
      callback(args, expected);
    });
  });
}

export const { VOLTA_HOME } = process.env as { VOLTA_HOME: string };
export const YARN_PATH = resolve(VOLTA_HOME, 'bin/yarn');

export async function gitDeleteLocalBranch(): Promise<void> {
  // get the current branch name
  const { current } = await git.branchLocal();
  await git.checkout('master');

  // only delete if a branch rehearsal-bot created
  if (current !== 'master' && current.includes('rehearsal-bot')) {
    await git.deleteLocalBranch(current);
  }
}
