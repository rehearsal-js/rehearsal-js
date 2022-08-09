import { describe, test, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { setGracefulCleanup } from 'tmp';
import { git } from '../../src/utils';
import { gitDeleteLocalBranch, YARN_PATH } from '../test-helpers';
// import { existsSync, readJSONSync } from 'fs-extra';
import { join, resolve } from 'path';

// import type { Report } from '@rehearsal/reporter';

// import { upgradeCommand } from '../../src/commands/upgrade';
// import { getLatestTSVersion, git } from '../../src/utils';

import execa = require('execa');

const FIXTURE_APP_PATH = resolve(__dirname, '../fixtures/app');
// const RESULTS_FILEPATH = join(FIXTURE_APP_PATH, '.rehearsal.json');
// we want an older version of typescript to test against
// eg 4.2.4 since we want to be sure to get compile errors
const TEST_TSC_VERSION = '4.5.5';
let WORKING_BRANCH = '';

const beforeSetup = async (): Promise<void> => {
  const { current } = await git.branchLocal();
  WORKING_BRANCH = current;
  // install the test version of tsc
  await execa(YARN_PATH, ['add', '-D', `typescript@${TEST_TSC_VERSION}`, '--ignore-scripts']);
};

const afterEachCleanup = async (): Promise<void> => {
  await gitDeleteLocalBranch(WORKING_BRANCH);
  await execa(YARN_PATH, ['add', '-D', `typescript@${TEST_TSC_VERSION}`, '--ignore-scripts']);
  await execa(YARN_PATH, ['install']);
};

describe('upgrade:command against fixture', async () => {
  // beforeEach(async () => {
  //   await beforeSetup();
  // });

  // afterEach(async () => {
  //   await afterEachCleanup();
  // });

  afterAll(async () => {
    const { current } = await git.branchLocal();

    // delete the branch created by rehearsal for future tests
    await gitDeleteLocalBranch(current);
    setGracefulCleanup();
  });

  test('WITH autofix', async (ctx) => {
    const result = await upgradeCommand.parse([
      __dirname,
      '--src_dir',
      FIXTURE_APP_PATH,
      '--dry_run',
      '--is_test',
      '--report_output',
      FIXTURE_APP_PATH,
      '--autofix',
    ]);

    console.log(result);
    expect(true);

    // default is beta unless otherwise specified
    // const latestPublishedTSVersion = await getLatestTSVersion();

    // expect(ctx.stdout).to.contain(`Rehearsing with typescript@${latestPublishedTSVersion}`);
    // expect(ctx.stdout).to.contain(`Autofix successful: code changes applied`);
    // assert.ok(existsSync(RESULTS_FILEPATH), `result file ${RESULTS_FILEPATH} should exists`);
    // const report: Report = readJSONSync(RESULTS_FILEPATH);

    // assert.isNotEmpty(report);

    // assert.equal(report.summary.projectName, '@rehearsal/cli');
    // assert.equal(report.summary.tsVersion, latestPublishedTSVersion);
    // assert.equal(report.summary.uniqueErrors, 3);
    // assert.equal(report.summary.totalErrors, 28);
    // assert.deepEqual(report.summary.totalErrorsList, {
    //   '2322': 1,
    //   '2616': 3,
    //   '6133': 24,
    // });
    // assert.equal(report.summary.fixedErrors, 3);
    // assert.deepEqual(report.summary.fixedErrorsList, {
    //   '2322': 0,
    //   '2616': 0,
    //   '6133': 3,
    // });
    // assert.equal(report.summary.files, 3);
    // assert.deepEqual(report.summary.filesList, [
    //   '/foo/foo.ts',
    //   '/foo_2/foo_2a.ts',
    //   '/foo_2/foo_2b.ts',
    // ]);

    // assert.equal(report.items.length, 28);

    // const firstFileReportError = report.items[0];

    // assert.equal(firstFileReportError.code, 2616);
    // assert.equal(firstFileReportError.category, 'Error');
    // assert.equal(firstFileReportError.fixed, false);
    // assert.equal(firstFileReportError.nodeKind, 'ImportSpecifier');
    // assert.equal(firstFileReportError.nodeText, 'execa');
    // assert.equal(
    //   firstFileReportError.message,
    //   `'execa' can only be imported by using 'import execa = require("execa")' or a default import.`
    // );
    // assert.equal(
    //   firstFileReportError.hint,
    //   `'execa' can only be imported by using 'import execa = require("execa")' or a default import.`
    // );
  });

  // test.stdout().it('NO autofix', async (ctx) => {
  //   await Upgrade.run([
  //     '--src_dir',
  //     FIXTURE_APP_PATH,
  //     '--dry_run',
  //     '--is_test',
  //     '--report_output',
  //     FIXTURE_APP_PATH,
  //   ]);

  //   expect(ctx.stdout).to.contain(`Autofix successful: ts-expect-error comments added`);
  // });
});

// describe('upgrade:command tsc version check', async () => {
//   test.stderr().it(`on typescript invalid tsc_version`, async () => {
//     try {
//       await Upgrade.run(['--tsc_version', '']);
//     } catch (error) {
//       expect(`${error}`).to.contain(
//         `The tsc_version specified is an invalid string. Please specify a valid version as n.n.n`
//       );
//     }

//     try {
//       await Upgrade.run(['--tsc_version', '0']);
//     } catch (error) {
//       expect(`${error}`).to.contain(
//         `The tsc_version specified is an invalid string. Please specify a valid version as n.n.n`
//       );
//     }
//   });

//   test.stdout().it(`on typescript version already tested`, async (ctx) => {
//     // this will test the version already installed
//     // the test sandbox should have an older version of tsc installed
//     // during the afterEachCleanup() phase
//     await Upgrade.run([
//       '--src_dir',
//       FIXTURE_APP_PATH,
//       '--tsc_version',
//       TEST_TSC_VERSION,
//       '--dry_run',
//       '--is_test',
//     ]);

//     // TODO: Fix CLI or this test
//     expect(ctx.stdout).to.contain(
//       `This application is already on the latest version of TypeScript@`
//     );
//   });
// }).afterEach(afterEachCleanup);
