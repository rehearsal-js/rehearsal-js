import { type Report } from '@rehearsal/reporter';
import execa from 'execa';
import { existsSync, readJSONSync } from 'fs-extra';
import { join, resolve } from 'path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import packageJson from '../../package.json';
import { getLatestTSVersion, git } from '../../src/utils';
import { gitDeleteLocalBranch, PNPM_PATH, runTSNode } from '../test-helpers';

const FIXTURE_APP_PATH = resolve(__dirname, '../fixtures/app');
// we want an older version of typescript to test against
// eg 4.2.4 since we want to be sure to get compile errors
const TEST_TSC_VERSION = '4.5.5';
const ORIGIN_TSC_VERSION = packageJson.devDependencies.typescript;
let WORKING_BRANCH = '';

const beforeSetup = async (): Promise<void> => {
  const { current } = await git.branchLocal();
  WORKING_BRANCH = current;
  // install the test version of tsc
  await execa(PNPM_PATH, ['add', '-D', `typescript@${TEST_TSC_VERSION}`]);
};

const afterEachCleanup = async (): Promise<void> => {
  await gitDeleteLocalBranch(WORKING_BRANCH);
};

// Revert to previous TSC version from TEST_TSC_VERSION
const revertTSCVersion = async (): Promise<void> => {
  await execa(PNPM_PATH, ['add', '-D', `typescript@${ORIGIN_TSC_VERSION}`]);
  await execa(PNPM_PATH, ['install']);
};

afterAll(revertTSCVersion);

describe('upgrade:command', async () => {
  beforeAll(beforeSetup);
  afterAll(afterEachCleanup);

  test('against fixture with typescript@beta', async () => {
    // runs against `beta` by default
    const result = await runTSNode('upgrade', [FIXTURE_APP_PATH, '--report', 'json', '--dryRun']);

    // default is beta unless otherwise specified
    const latestPublishedTSVersion = await getLatestTSVersion('beta');
    const reportFile = join(FIXTURE_APP_PATH, '.rehearsal', 'report.json');

    expect(result.stdout).contain(`Rehearsing with typescript@${latestPublishedTSVersion}`);
    expect(result.stdout).to.contain(`Codefixes applied successfully`);
    expect(existsSync(reportFile)).toBeTruthy;

    const report: Report = readJSONSync(reportFile);

    expect(report).toMatchSnapshot();
  });

  test('against fixture with typescript@rc', async () => {
    const buildTag = 'rc';

    const result = await runTSNode('upgrade', [
      FIXTURE_APP_PATH,
      '--report',
      'json',
      '--dryRun',
      '--build',
      buildTag,
    ]);

    const latestPublishedTSVersion = await getLatestTSVersion(buildTag);
    const reportFile = join(FIXTURE_APP_PATH, '.rehearsal', 'report.json');

    expect(result.stdout).contain(`Rehearsing with typescript@${latestPublishedTSVersion}`);
    expect(result.stdout).to.contain(`Codefixes applied successfully`);
    expect(existsSync(reportFile)).toBeTruthy;

    const report: Report = readJSONSync(reportFile);

    expect(report).toMatchSnapshot();
  });

  test('against fixture with typescript@latest', async () => {
    const buildTag = 'latest';

    const result = await runTSNode('upgrade', [
      FIXTURE_APP_PATH,
      '--report',
      'json',
      '--dryRun',
      '--build',
      buildTag,
    ]);

    const latestPublishedTSVersion = await getLatestTSVersion(buildTag);
    const reportFile = join(FIXTURE_APP_PATH, '.rehearsal', 'report.json');

    expect(result.stdout).contain(`Rehearsing with typescript@${latestPublishedTSVersion}`);
    expect(result.stdout).to.contain(`Codefixes applied successfully`);
    expect(existsSync(reportFile)).toBeTruthy;

    const report: Report = readJSONSync(reportFile);

    expect(report).toMatchSnapshot();
  });
});

describe('upgrade:command tsc version check', async () => {
  beforeAll(beforeSetup);
  afterAll(afterEachCleanup);

  test(`it is on typescript invalid tsVersion`, async () => {
    try {
      await runTSNode('upgrade', [FIXTURE_APP_PATH, '--tsVersion', '']);
    } catch (error) {
      expect(`${error}`).to.contain(
        `The tsVersion specified is an invalid string. Please specify a valid version as n.n.n`
      );
    }

    try {
      await runTSNode('upgrade', [FIXTURE_APP_PATH, '--tsVersion', '0']);
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

    const result = await runTSNode('upgrade', [
      FIXTURE_APP_PATH,
      '--tsVersion',
      TEST_TSC_VERSION,
      '--dryRun',
    ]);

    expect(result.stdout).toContain(
      `This application is already on the latest version of TypeScript@${TEST_TSC_VERSION}`
    );
  });
});
