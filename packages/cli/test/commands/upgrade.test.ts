import { join, resolve } from 'path';
import { type Report } from '@rehearsal/reporter';
import execa from 'execa';
import { existsSync, readJSONSync, rmSync } from 'fs-extra';
import { afterAll, afterEach, beforeEach, describe, expect, test } from 'vitest';

import packageJson from '../../package.json';
import { getLatestTSVersion, git } from '../../src/utils';
import { gitDeleteLocalBranch, PNPM_PATH, runBin } from '../test-helpers';

const FIXTURE_APP_PATH = resolve(__dirname, '../fixtures/app');
// we want an older version of typescript to test against
// eg 4.2.4 since we want to be sure to get compile errors
const TEST_TSC_VERSION = '4.5.5';
const ORIGIN_TSC_VERSION = packageJson.devDependencies.typescript;
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
  await execa(PNPM_PATH, ['add', '-D', `typescript@${ORIGIN_TSC_VERSION}`]);
  await execa(PNPM_PATH, ['install']);
});

describe.each(['rc', 'latest', 'beta', 'latestBeta'])(
  'upgrade:command typescript@%s',
  async (buildTag) => {
    beforeEach(beforeEachPrep);
    afterEach(afterEachCleanup);

    test('runs', async () => {
      // runs against `latestBeta` by default
      const result = await runBin(
        'upgrade',
        [FIXTURE_APP_PATH, '--report', 'json', '--dryRun', '--build', buildTag],
        { cwd: FIXTURE_APP_PATH }
      );

      // default is beta unless otherwise specified
      const latestPublishedTSVersion = await getLatestTSVersion(buildTag);
      const reportFile = join(FIXTURE_APP_PATH, '.rehearsal', 'report.json');

      expect(result.stdout).contain(`Rehearsing with typescript@${latestPublishedTSVersion}`);
      expect(result.stdout).to.contain(`Codefixes applied successfully`);
      expect(existsSync(reportFile)).toBeTruthy;

      const report: Report = readJSONSync(reportFile);
      expect(report).to.exist;
      expect(report).toHaveProperty('summary');
      expect(report.summary.projectName).toBe('@rehearsal/cli');
      expect(report.summary.tsVersion).toBe(latestPublishedTSVersion);
    });
  }
);

describe('upgrade:command typescript@next', async () => {
  beforeEach(beforeEachPrep);
  afterEach(afterEachCleanup);

  test('runs', async () => {
    const buildTag = 'next';

    const result = await runBin(
      'upgrade',
      [FIXTURE_APP_PATH, '--report', 'sarif', '--dryRun', '--build', buildTag],
      { cwd: FIXTURE_APP_PATH }
    );
    // eg. 4.9.0-dev.20220930
    const latestPublishedTSVersion = await getLatestTSVersion(buildTag);
    const reportFile = join(FIXTURE_APP_PATH, '.rehearsal', 'report.sarif');

    expect(result.stdout).contain(`Rehearsing with typescript@${latestPublishedTSVersion}`);
    expect(existsSync(reportFile)).toBeTruthy;

    const report: Report = readJSONSync(reportFile);
    expect(report).to.exist;
  });
});

describe('upgrade:command tsc version check', async () => {
  beforeEach(beforeEachPrep);
  afterEach(afterEachCleanup);

  test(`it is on typescript invalid tsVersion`, async () => {
    try {
      await runBin('upgrade', [FIXTURE_APP_PATH, '--tsVersion', ''], { cwd: FIXTURE_APP_PATH });
    } catch (error) {
      expect(`${error}`).to.contain(
        `The tsVersion specified is an invalid string. Please specify a valid version as n.n.n`
      );
    }

    try {
      await runBin('upgrade', [FIXTURE_APP_PATH, '--tsVersion', '0'], { cwd: FIXTURE_APP_PATH });
    } catch (error) {
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
