import { setGracefulCleanup } from 'tmp';
import { beforeEach, describe, expect, test } from 'vitest';
import { type SimpleGit, simpleGit, type SimpleGitOptions } from 'simple-git';

import { runBin, prepareTmpDir } from '../../test-helpers';

setGracefulCleanup();

describe('migrate - validate repo status', async () => {
  let basePath = '';

  beforeEach(() => {
    basePath = prepareTmpDir('initialization');
  });

  test('pass in a non git project', async () => {
    const { stdout } = await runBin('migrate', [], {
      cwd: basePath,
    });

    expect(stdout).toContain('Migration Complete');
  });

  test('pass in a clean git project', async () => {
    // simulate clean git project
    const git: SimpleGit = simpleGit({
      baseDir: basePath,
    } as Partial<SimpleGitOptions>);
    await git.init();
    await git.add('package.json');
    // GH CI would require git name and email
    await git.addConfig('user.name', 'tester');
    await git.addConfig('user.email', 'tester@tester.com');
    await git.commit('test');

    const { stdout } = await runBin('migrate', [], {
      cwd: basePath,
    });

    expect(stdout).toContain('Migration Complete');
  });

  test('exit in a dirty git project', async () => {
    // simulate clean git project
    const git: SimpleGit = simpleGit({
      baseDir: basePath,
    } as Partial<SimpleGitOptions>);
    await git.init();
    await git.add('package.json');

    const { stdout } = await runBin('migrate', [], {
      cwd: basePath,
    });

    expect(stdout).toContain(
      'You have uncommitted files in your repo. Please commit or stash them as Rehearsal will reset your uncommitted changes.'
    );
  });

  test('pass in a dirty git project with --dryRun', async () => {
    // simulate clean git project
    const git: SimpleGit = simpleGit({
      baseDir: basePath,
    } as Partial<SimpleGitOptions>);
    await git.init();
    await git.add('package.json');

    const { stdout } = await runBin('migrate', ['-d'], {
      cwd: basePath,
    });

    expect(stdout).toContain('Initialize -- Dry Run Mode');
    expect(stdout).toContain('List of files will be attempted to migrate:');
  });
});
