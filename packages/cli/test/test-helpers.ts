import { resolve } from 'path';
import execa from 'execa';
import which from 'which';

import { git, gitIsRepoDirty } from '../src/utils';
export { addDep } from '../src/utils';

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

// helper funcion to run a command via ts-node
// stdout of commands available via ExecaChildProcess.stdout
export function runTSNode(
  command: string,
  args: string[],
  options: execa.Options = {}
): execa.ExecaChildProcess {
  const cliPath = resolve(__dirname, `./runner.ts`);
  // why use ts-node instead of calling bin/rehearsal.js directly?
  // during the test process there would be pnpm install typescript
  // we need to run build after every install to make sure dist dir is ready to use
  return execa(PNPM_PATH, ['ts-node', cliPath, command, ...args], options);
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
