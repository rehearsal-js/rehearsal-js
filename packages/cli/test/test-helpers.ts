import { resolve } from 'path';
import execa from 'execa';
import { git, gitIsRepoDirty } from '../src/utils';

export const { VOLTA_HOME } = process.env as { VOLTA_HOME: string };
export const YARN_PATH = resolve(VOLTA_HOME, 'bin/yarn');

export async function gitDeleteLocalBranch(checkoutBranch?: string): Promise<void> {
  // this should be the rehearsal-bot branch
  const { current } = await git.branchLocal();
  // grab the current working branch which should not be the rehearsal-bot branch
  const branch = checkoutBranch || 'master';

  if ((await gitIsRepoDirty()) && current.includes('rehearsal-bot')) {
    await git.reset(['--hard']);
  }

  await git.checkout(branch);

  // only delete if a branch rehearsal-bot created
  if (current !== 'master' && current.includes('rehearsal-bot')) {
    await git.deleteLocalBranch(current);
  }
}

// helper funcion to run a command via ts-node
// stdout of commands available via ExecaChildProcess.stdout
export function run(
  command: string,
  args: string[],
  options: execa.Options = {}
): execa.ExecaChildProcess {
  const cliPath = resolve(__dirname, `../src/commands/${command}`);
  return execa(YARN_PATH, ['ts-node', cliPath, ...args], options);
}
