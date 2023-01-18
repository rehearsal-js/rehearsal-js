import { join, resolve } from 'path';
import execa from 'execa';
import which from 'which';
import { rmSync } from 'fs-extra';
import packageJson from '../package.json';

import { git, gitIsRepoDirty } from '../src/utils';

export const PNPM_PATH = which.sync('pnpm');

export async function gitDeleteLocalBranch(checkoutBranch?: string): Promise<void> {
  // this should be the rehearsal-bot branch
  const { current } = await git.branchLocal();
  // grab the current working branch which should not be the rehearsal-bot branch
  const branch = checkoutBranch || 'master';

  // only restore files in fixtures
  if (await gitIsRepoDirty()) {
    await execa('git', ['restore', '--', resolve(__dirname, './fixtures/app')]);
  }

  await git.checkout(branch);

  // only delete if a branch rehearsal-bot created
  if (current !== 'master' && current.includes('rehearsal-bot')) {
    await git.deleteLocalBranch(current);
  }
}

// helper funcion to run a command via the actual bin
// stdout of commands available via ExecaChildProcess.stdout
export function runBin(
  command: string,
  args: string[],
  options: execa.Options = {}
): execa.ExecaChildProcess {
  const cliPath = resolve(__dirname, `../bin/rehearsal.js`);
  return execa(cliPath, [command, ...args], options);
}

let WORKING_BRANCH = '';

export const FIXTURE_APP_PATH = resolve(__dirname, '../fixtures/app');

// we want an older version of typescript to test against
// eg 4.2.4 since we want to be sure to get compile errors
export const TEST_TSC_VERSION = '4.5.5';
export const ORIGIN_TSC_VERSION = packageJson.dependencies.typescript;

// we bundle typescript in deps
export const beforeEachPrep = async (): Promise<void> => {
  const { current } = await git.branchLocal();
  WORKING_BRANCH = current;
  // install the test version of tsc
  await execa(PNPM_PATH, ['add', '-w', `typescript@${TEST_TSC_VERSION}`]);
  await execa(PNPM_PATH, ['install']);
  // clean any report files
  rmSync(join(FIXTURE_APP_PATH, '.rehearsal'), { recursive: true, force: true });
};

// Revert to previous TSC version from TEST_TSC_VERSION
export const afterEachCleanup = async (): Promise<void> => {
  await gitDeleteLocalBranch(WORKING_BRANCH);
};
