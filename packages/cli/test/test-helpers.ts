import { inspect } from 'util';
import { test } from 'mocha';
import { resolve } from 'path';

import { git } from '../src';

import { gitIsRepoDirty } from '../src/utils';

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

export async function gitDeleteLocalBranch(checkoutBranch?: string): Promise<void> {
  // this should be the rehearsal-bot branch
  const { current } = await git.branchLocal();
  // grab the current working branch which should not be the rehearsal-bot branch
  const branch = checkoutBranch || 'master';

  if ((await gitIsRepoDirty()) && current !== 'master') {
    await git.reset(['--hard']);
  }

  await git.checkout(branch);

  // only delete if a branch rehearsal-bot created
  if (current !== 'master' && current.includes('rehearsal-bot')) {
    await git.deleteLocalBranch(current);
  }
}
