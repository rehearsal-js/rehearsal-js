import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readJSONSync } from 'fs-extra/esm';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { getLatestTSVersion } from '@rehearsal/utils';
import { Project } from 'fixturify-project';

import { runBin } from '../test-helpers/index.js';
import type { PackageJson } from 'type-fest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIXTURE_APP_PATH = resolve(__dirname, '../fixtures/app');

// We symlink the dependencies we have into the system temp so we will get whatever version at the root of the project is
const ROOT_PACKAGE_JSON = readJSONSync(
  resolve(__dirname, '../../../../package.json')
) as PackageJson;

const TEST_TSC_VERSION = ROOT_PACKAGE_JSON?.devDependencies?.['typescript']
  ? ROOT_PACKAGE_JSON?.devDependencies?.['typescript'].replace('^', '')
  : '';

describe.each(['rc', 'latest', 'beta', 'latestBeta'])(
  'upgrade:command typescript@%s',
  (buildTag) => {
    let project: Project;

    beforeEach(async () => {
      project = Project.fromDir(FIXTURE_APP_PATH, { linkDeps: true, linkDevDeps: true });
      await project.write();
    });

    afterEach(() => {
      project.dispose();
    });

    test('runs', async () => {
      // runs against `latestBeta` by default
      const result = await runBin(
        'upgrade',
        [project.baseDir, '--format', 'json', '--dryRun', '--build', buildTag],
        { cwd: project.baseDir }
      );

      // default is beta unless otherwise specified
      const latestPublishedTSVersion = await getLatestTSVersion(buildTag);
      const reportFile = join(project.baseDir, '.rehearsal', 'upgrade-report.json');

      expect(result.stdout).contain(`Rehearsing with typescript@${latestPublishedTSVersion}`);
      expect(result.stdout).to.contain(`Codefixes applied successfully`);
      expect(existsSync(reportFile)).toBeTruthy();

      const report = readJSONSync(reportFile) as import('@rehearsal/reporter').Report;
      expect(report).to.exist;
      expect(report).toHaveProperty('summary');
      expect(report.summary[0].projectName).toBe('sample-project');
      expect(report.summary[0].tsVersion).toBe(latestPublishedTSVersion);
    });
  }
);

describe('upgrade:command typescript@next', () => {
  let project: Project;

  beforeEach(async () => {
    project = Project.fromDir(FIXTURE_APP_PATH, { linkDeps: true, linkDevDeps: true });
    await project.write();
  });

  afterEach(() => {
    project.dispose();
  });

  test('runs', async () => {
    const buildTag = 'next';

    const result = await runBin(
      'upgrade',
      [project.baseDir, '--format', 'sarif', '--dryRun', '--build', buildTag],
      { cwd: project.baseDir }
    );
    // eg. 4.9.0-dev.20220930
    const latestPublishedTSVersion = await getLatestTSVersion(buildTag);
    const reportFile = join(project.baseDir, '.rehearsal', 'upgrade-report.sarif');

    expect(result.stdout).contain(`Rehearsing with typescript@${latestPublishedTSVersion}`);
    expect(existsSync(reportFile)).toBeTruthy();

    const report = readJSONSync(reportFile) as import('@rehearsal/reporter').Report;
    expect(report).to.exist;
  });
});

describe('upgrade:command tsc version check', () => {
  let project: Project;

  beforeEach(async () => {
    project = Project.fromDir(FIXTURE_APP_PATH, { linkDeps: true, linkDevDeps: true });
    await project.write();
  });

  afterEach(() => {
    project.dispose();
  });

  test(`it is on typescript invalid tsVersion`, async () => {
    try {
      await runBin('upgrade', [project.baseDir, '--tsVersion', ''], { cwd: project.baseDir });
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      expect(`${error}`).to.contain(
        `The tsVersion specified is an invalid string. Please specify a valid version as n.n.n`
      );
    }

    try {
      await runBin('upgrade', [project.baseDir, '--tsVersion', '0'], { cwd: project.baseDir });
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      expect(`${error}`).to.contain(
        `The tsVersion specified is an invalid string. Please specify a valid version as n.n.n`
      );
    }
  });

  test(`it is on typescript version already tested`, async () => {
    const result = await runBin(
      'upgrade',
      [project.baseDir, '--tsVersion', `${TEST_TSC_VERSION}`, '--dryRun'],
      { cwd: project.baseDir }
    );

    expect(result.stdout).toContain(
      `This application is already on the latest version of TypeScript@${TEST_TSC_VERSION}`
    );
  });
});
