import { type Report } from '@rehearsal/reporter';
import execa from 'execa';
import { existsSync, readJSONSync } from 'fs-extra';
import { join, resolve } from 'path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import packageJson from '../../package.json';
import { getLatestTSVersion, git } from '../../src/utils';
import { gitDeleteLocalBranch, run, YARN_PATH } from '../test-helpers';

const FIXTURE_APP_PATH = resolve(__dirname, '../fixtures/app');
const RESULTS_FILEPATH = join(FIXTURE_APP_PATH, '.rehearsal.json');
// we want an older version of typescript to test against
// eg 4.2.4 since we want to be sure to get compile errors
const TEST_TSC_VERSION = '4.5.5';
const ORIGIN_TSC_VERSION = packageJson.devDependencies.typescript;
let WORKING_BRANCH = '';

const beforeSetup = async (): Promise<void> => {
  const { current } = await git.branchLocal();
  WORKING_BRANCH = current;
  // install the test version of tsc
  await execa(YARN_PATH, ['add', '-D', `typescript@${TEST_TSC_VERSION}`, '--ignore-scripts']);
};

const afterEachCleanup = async (): Promise<void> => {
  await gitDeleteLocalBranch(WORKING_BRANCH);
};

// Revert to previous TSC version from TEST_TSC_VERSION
const revertTSCVersion = async (): Promise<void> => {
  await execa(YARN_PATH, ['add', '-D', `typescript@${ORIGIN_TSC_VERSION}`, '--ignore-scripts']);
  await execa(YARN_PATH, ['install']);
};

afterAll(revertTSCVersion);

describe('upgrade:command', async () => {
  beforeAll(beforeSetup);
  afterAll(afterEachCleanup);

  test('against fixture', async () => {
    const result = await run('upgrade', [
      '--src_dir',
      FIXTURE_APP_PATH,
      '--dry_run',
      '--report_output',
      FIXTURE_APP_PATH,
    ]);

    // default is beta unless otherwise specified
    const latestPublishedTSVersion = await getLatestTSVersion();

    expect(result.stdout).contain(`Rehearsing with typescript@${latestPublishedTSVersion}`);
    expect(result.stdout).to.contain(`Codefixes applied successfully`);
    expect(existsSync(RESULTS_FILEPATH)).toBeTruthy;

    const report: Report = readJSONSync(RESULTS_FILEPATH);

    expect(report).toHaveProperty('summary');

    expect(report.summary.projectName).toBe('@rehearsal/cli');
    expect(report.summary.tsVersion).toBe(latestPublishedTSVersion);
    expect(report.summary.uniqueErrors).toBe(3);
    expect(report.summary.totalErrors).toBe(28);
    expect(report.summary.totalErrorsList).toStrictEqual({
      '2322': 1,
      '2616': 3,
      '6133': 24,
    });
    expect(report.summary.fixedErrors).toBe(3);
    expect(report.summary.fixedErrorsList).toStrictEqual({
      '2322': 0,
      '2616': 0,
      '6133': 3,
    });
    expect(report.summary.files).toBe(3);
    expect(report.summary.filesList).toStrictEqual([
      '/foo/foo.ts',
      '/foo_2/foo_2a.ts',
      '/foo_2/foo_2b.ts',
    ]);
    expect(report.items.length).toBe(28);

    const firstFileReportError = report.items[0];

    expect(firstFileReportError.errorCode).toEqual(2616);
    expect(firstFileReportError.category).toEqual('Error');
    expect(firstFileReportError.fixed).toEqual(false);
    expect(firstFileReportError.nodeKind).toEqual('ImportSpecifier');
    expect(firstFileReportError.nodeText).toEqual('execa');
    expect(firstFileReportError.message).toEqual(
      `'execa' can only be imported by using 'import execa = require("execa")' or a default import.`
    );
    expect(firstFileReportError.hint).toEqual(
      `'execa' can only be imported by using 'import execa = require("execa")' or a default import.`
    );
  });
});

describe('upgrade:command tsc version check', async () => {
  beforeAll(beforeSetup);
  afterAll(afterEachCleanup);

  test(`it is on typescript invalid tsc_version`, async () => {
    try {
      await run('upgrade', ['--tsc_version', '']);
    } catch (error) {
      expect(`${error}`).to.contain(
        `The tsc_version specified is an invalid string. Please specify a valid version as n.n.n`
      );
    }

    try {
      await run('upgrade', ['--tsc_version', '0']);
    } catch (error) {
      expect(`${error}`).to.contain(
        `The tsc_version specified is an invalid string. Please specify a valid version as n.n.n`
      );
    }
  });

  test(`it is on typescript version already tested`, async () => {
    // this will test the version already installed
    await execa(YARN_PATH, ['add', '-D', `typescript@${TEST_TSC_VERSION}`, '--ignore-scripts']);
    await execa(YARN_PATH, ['install']);

    const result = await run('upgrade', [
      '--src_dir',
      FIXTURE_APP_PATH,
      '--tsc_version',
      TEST_TSC_VERSION,
      '--dry_run',
    ]);

    // TODO: Fix CLI or this test
    expect(result.stdout).toContain(
      `This application is already on the latest version of TypeScript@`
    );
  });
});
