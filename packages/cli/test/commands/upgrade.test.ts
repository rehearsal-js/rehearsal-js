import { dirname, join, resolve } from 'node:path';
import { existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import { readJSONSync } from 'fs-extra/esm';
import { afterAll, afterEach, beforeEach, describe, expect, test } from 'vitest';
import { getLatestTSVersion, git } from '@rehearsal/utils';

import { gitDeleteLocalBranch, PNPM_PATH, runBin } from '../test-helpers/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIXTURE_APP_PATH = resolve(__dirname, '../fixtures/app');
// we want an older version of typescript to test against
// eg 4.2.4 since we want to be sure to get compile errors
const TEST_TSC_VERSION = '4.5.5';
// we bundle the latest version of typescript with the cli
let WORKING_BRANCH = '';

const beforeEachPrep = async (): Promise<void> => {
  const { current } = await git.branchLocal();
  WORKING_BRANCH = current;
  // install the test version of tsc
  await execa(PNPM_PATH, ['add', '-D', `typescript@${TEST_TSC_VERSION}`]);
  await execa(PNPM_PATH, ['install']);
  // clean any report files
  rmSync(join(FIXTURE_APP_PATH, '.rehearsal'), { recursive: true, force: true });
};

// Revert to previous TSC version from TEST_TSC_VERSION
const afterEachCleanup = async (): Promise<void> => {
  await gitDeleteLocalBranch(WORKING_BRANCH);
};

// Revert to development version of TSC
afterAll(async (): Promise<void> => {
  await execa(PNPM_PATH, ['remove', '-D', `typescript`]);
  await execa(PNPM_PATH, ['install']);
});

describe.each(['rc', 'latest', 'beta', 'latestBeta'])(
  'upgrade:command typescript@%s',
  (buildTag) => {
    beforeEach(beforeEachPrep);
    afterEach(afterEachCleanup);

    test('runs', async () => {
      // runs against `latestBeta` by default
      const result = await runBin(
        'upgrade',
        [FIXTURE_APP_PATH, '--format', 'json', '--dryRun', '--build', buildTag],
        { cwd: FIXTURE_APP_PATH }
      );

      // default is beta unless otherwise specified
      const latestPublishedTSVersion = await getLatestTSVersion(buildTag);
      const reportFile = join(FIXTURE_APP_PATH, '.rehearsal', 'upgrade-report.json');

      expect(result.stdout).contain(`Rehearsing with typescript@${latestPublishedTSVersion}`);
      expect(result.stdout).to.contain(`Codefixes applied successfully`);
      expect(existsSync(reportFile)).toBeTruthy();

      const report = readJSONSync(reportFile) as import('@rehearsal/reporter').Report;
      expect(report).to.exist;
      expect(report).toHaveProperty('summary');
      expect(report.summary[0].projectName).toBe('@rehearsal/cli');
      expect(report.summary[0].tsVersion).toBe(latestPublishedTSVersion);
    });
  }
);

describe('upgrade:command typescript@next', () => {
  beforeEach(beforeEachPrep);
  afterEach(afterEachCleanup);

  test('runs', async () => {
    const buildTag = 'next';

    const result = await runBin(
      'upgrade',
      [FIXTURE_APP_PATH, '--format', 'sarif', '--dryRun', '--build', buildTag],
      { cwd: FIXTURE_APP_PATH }
    );
    // eg. 4.9.0-dev.20220930
    const latestPublishedTSVersion = await getLatestTSVersion(buildTag);
    const reportFile = join(FIXTURE_APP_PATH, '.rehearsal', 'upgrade-report.sarif');

    expect(result.stdout).contain(`Rehearsing with typescript@${latestPublishedTSVersion}`);
    expect(existsSync(reportFile)).toBeTruthy();

    const report = readJSONSync(reportFile) as import('@rehearsal/reporter').Report;
    expect(report).to.exist;
  });
});

describe('upgrade:command tsc version check', () => {
  beforeEach(beforeEachPrep);
  afterEach(afterEachCleanup);

  test(`it is on typescript invalid tsVersion`, async () => {
    try {
      await runBin('upgrade', [FIXTURE_APP_PATH, '--tsVersion', ''], { cwd: FIXTURE_APP_PATH });
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      expect(`${error}`).to.contain(
        `The tsVersion specified is an invalid string. Please specify a valid version as n.n.n`
      );
    }

    try {
      await runBin('upgrade', [FIXTURE_APP_PATH, '--tsVersion', '0'], { cwd: FIXTURE_APP_PATH });
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      expect(`${error}`).to.contain(
        `The tsVersion specified is an invalid string. Please specify a valid version as n.n.n`
      );
    }
  });

  test(`it is on typescript version already tested`, async () => {
    // this will test the version already installed
    await execa(PNPM_PATH, ['add', '-D', `typescript@${TEST_TSC_VERSION}`]);
    await execa(PNPM_PATH, ['install']);

    const result = await runBin(
      'upgrade',
      [FIXTURE_APP_PATH, '--tsVersion', TEST_TSC_VERSION, '--dryRun'],
      { cwd: FIXTURE_APP_PATH }
    );

    expect(result.stdout).toContain(
      `This application is already on the latest version of TypeScript@${TEST_TSC_VERSION}`
    );
  });
});
