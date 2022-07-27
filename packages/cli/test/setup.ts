import { setGracefulCleanup } from 'tmp';
import { after } from 'mocha';
import { gitDeleteLocalBranch } from './test-helpers';

after(async () => {
  // delete the branch created by rehearsal for future tests
  await gitDeleteLocalBranch();
  setGracefulCleanup();
});
