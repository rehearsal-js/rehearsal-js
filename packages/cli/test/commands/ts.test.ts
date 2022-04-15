import { test } from '@oclif/test';
import { describe } from 'mocha';
import { expect, assert } from 'chai';
import execa = require('execa');
import { existsSync, readJSONSync } from 'fs-extra';
import { join, resolve } from 'path';

import type { Report } from '@rehearsal/reporter';

import { restoreLocalGit, YARN_PATH } from '../test-helpers';
import { TS } from '../../src';
import { getLatestTSVersion } from '../../src/utils';

const FIXTURE_APP_PATH = resolve(__dirname, '../fixtures/app');
const RESULTS_FILEPATH = join(FIXTURE_APP_PATH, '.rehearsal.json');
// we want an older version of typescript to test against
// eg 4.2.4 since we want to be sure to get compile errors
const TEST_TSC_VERSION = '4.5.5';

const beforeSetup = async (): Promise<void> => {
  // install the test version of tsc
  await execa(YARN_PATH, ['add', '-D', `typescript@${TEST_TSC_VERSION}`, '--ignore-scripts']);
};

const afterEachCleanup = async (): Promise<void> => {
  await restoreLocalGit(FIXTURE_APP_PATH);
  await execa(YARN_PATH, ['add', '-D', `typescript@${TEST_TSC_VERSION}`, '--ignore-scripts']);
  await execa(YARN_PATH, ['install']);
};

describe('ts:command against fixture', async () => {
  before(beforeSetup);

  test.stdout().it('WITH autofix', async (ctx) => {
    await TS.run([
      '--src_dir',
      FIXTURE_APP_PATH,
      '--dry_run',
      '--is_test',
      '--report_output',
      FIXTURE_APP_PATH,
      '--autofix',
    ]);

    // default is beta unless otherwise specified
    const latestPublishedTSVersion = await getLatestTSVersion();

    console.log(latestPublishedTSVersion);

    expect(ctx.stdout).to.contain(`Rehearsing with typescript@${latestPublishedTSVersion}`);
    expect(ctx.stdout).to.contain(`Autofix successful: code changes applied`);
    assert.ok(existsSync(RESULTS_FILEPATH), `result file ${RESULTS_FILEPATH} should exists`);
    const report: Report = readJSONSync(RESULTS_FILEPATH);

    assert.isNotEmpty(report);

    assert.equal(report.summary.projectName, '@rehearsal/cli');
    assert.equal(report.summary.tsVersion, latestPublishedTSVersion);
    assert.equal(report.summary.cumulativeErrors, 26);
    assert.equal(report.summary.uniqueErrors, 2);
    assert.deepEqual(report.summary.uniqueErrorsList, [6133, 2322]);
    assert.equal(report.summary.autofixedErrors, 1);
    assert.deepEqual(report.summary.autofixedErrorsList, [6133]);
    assert.equal(report.summary.files, 3);
    assert.deepEqual(report.summary.filesList, [
      '/foo/foo.ts',
      '/foo_2/foo_2a.ts',
      '/foo_2/foo_2b.ts',
    ]);

    assert.equal(report.items.length, 26);

    const firstFileReportError = report.items[0];

    assert.equal(firstFileReportError.code, 6133);
    assert.equal(firstFileReportError.category, 'Error');
    assert.equal(firstFileReportError.fixed, true);
    assert.equal(firstFileReportError.nodeKind, 'Identifier');
    assert.equal(firstFileReportError.nodeText, 'git');
    assert.equal(firstFileReportError.message, `'git' is declared but its value is never read.`);
    assert.equal(
      firstFileReportError.hint,
      "The declaration 'git' is never read or used. Remove the declaration or use it."
    );
  });

  test.stdout().it('NO autofix', async (ctx) => {
    await TS.run([
      '--src_dir',
      FIXTURE_APP_PATH,
      '--dry_run',
      '--is_test',
      '--report_output',
      FIXTURE_APP_PATH,
    ]);

    expect(ctx.stdout).to.contain(`Autofix successful: ts-expect-error comments added`);
  });
}).afterEach(afterEachCleanup);

describe('ts:command tsc version check', async () => {
  test.stderr().it(`on typescript invalid tsc_version`, async () => {
    try {
      await TS.run(['--tsc_version', '']);
    } catch (error) {
      expect(`${error}`).to.contain(
        `The tsc_version specified is an invalid string. Please specify a valid version as n.n.n`
      );
    }

    try {
      await TS.run(['--tsc_version', '0']);
    } catch (error) {
      expect(`${error}`).to.contain(
        `The tsc_version specified is an invalid string. Please specify a valid version as n.n.n`
      );
    }
  });

  test.stdout().it(`on typescript version already tested`, async (ctx) => {
    // this will test the version already installed
    // the test sandbox should have an older version of tsc installed
    // during the afterEachCleanup() phase
    await TS.run([
      '--src_dir',
      FIXTURE_APP_PATH,
      '--tsc_version',
      TEST_TSC_VERSION,
      '--dry_run',
      '--is_test',
    ]);

    // TODO: Fix CLI or this test
    expect(ctx.stdout).to.contain(
      `This application is already on the latest version of TypeScript@`
    );
  });
}).afterEach(afterEachCleanup);
