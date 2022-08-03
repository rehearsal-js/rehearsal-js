import { setGracefulCleanup } from 'tmp';
import { after } from 'mocha';
import { git } from '../src';
import { gitDeleteLocalBranch } from './test-helpers';

after(async () => {
  const { current } = await git.branchLocal();

  // delete the branch created by rehearsal for future tests
  await gitDeleteLocalBranch(current);
  setGracefulCleanup();
});
