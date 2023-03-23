import { dirname, join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readJSONSync } from 'fs-extra/esm';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { getLatestTSVersion } from '@rehearsal/utils';
import { Project } from 'fixturify-project';
import { execa } from 'execa';

import { runBin } from '../test-helpers/index.js';
import type { PackageJson } from 'type-fest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE_APP_PATH = resolve(__dirname, '../fixtures/app');

const FIXTURE_APP = {
  packageJSON: readJSONSync(resolve(FIXTURE_APP_PATH, 'package.json')) as PackageJson,
  tsConfig: readFileSync(resolve(FIXTURE_APP_PATH, 'tsconfig.json'), 'utf8'),
  eslintrc: readFileSync(resolve(FIXTURE_APP_PATH, '.eslintrc.json'), 'utf8'),
  fooDir: {
    'foo.ts': readFileSync(resolve(FIXTURE_APP_PATH, 'foo/foo.ts'), 'utf8'),
  },
  fooDir2: {
    'foo_2a.ts': readFileSync(resolve(FIXTURE_APP_PATH, 'foo_2/foo_2a.ts'), 'utf8'),
    'foo_2b.ts': readFileSync(resolve(FIXTURE_APP_PATH, 'foo_2/foo_2b.ts'), 'utf8'),
  },
};

describe.each(['rc', 'latest', 'beta', 'latestBeta'])(
  'upgrade:command typescript@%s',
  (buildTag) => {
    let project: Project;

    // rewrite the fixture
    beforeEach(async () => {
      // linkDevDeps and the static project.fromDir will pull in typescript from the monorepo we do not want this
      project = new Project('sample-project');

      // this updates the fixturify project.pkg rather project.files['package.json'] they are different
      // this does NOT install packages (do that with pnpm install later)
      for (const [dep, version] of Object.entries(
        FIXTURE_APP.packageJSON['devDependencies'] as Record<string, string>
      )) {
        project.addDevDependency(dep, version);
      }
      project.files = {
        'tsconfig.json': FIXTURE_APP.tsConfig,
        '.eslintrc.json': FIXTURE_APP.eslintrc,
        ['foo']: FIXTURE_APP.fooDir,
        ['foo_2']: FIXTURE_APP.fooDir2,
      };

      await project.write();
      // run pnpm install on the fixturify project to get the binary for the default version of ts
      await execa('pnpm', ['install'], { cwd: project.baseDir });
    });

    // clean up the fixture
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
    // linkDevDeps and the static project.fromDir will pull in typescript from the monorepo we do not want this
    project = new Project('sample-project');

    // this updates the fixturify project.pkg rather project.files['package.json'] they are different
    // this does NOT install packages (do that with pnpm install later)
    for (const [dep, version] of Object.entries(
      FIXTURE_APP.packageJSON['devDependencies'] as Record<string, string>
    )) {
      project.addDevDependency(dep, version);
    }
    project.files = {
      'tsconfig.json': FIXTURE_APP.tsConfig,
      '.eslintrc.json': FIXTURE_APP.eslintrc,
      ['foo']: FIXTURE_APP.fooDir,
      ['foo_2']: FIXTURE_APP.fooDir2,
    };

    await project.write();
    // run pnpm install on the fixturify project to get the binary for the default version of ts
    await execa('pnpm', ['install'], { cwd: project.baseDir });
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
    const devDeps = FIXTURE_APP.packageJSON['devDependencies'] as Record<string, string>;
    // should be typescript 4.9.5
    const fixtureTSCVersion = devDeps['typescript'];

    const result = await runBin(
      'upgrade',
      [project.baseDir, '--tsVersion', `${fixtureTSCVersion}`, '--dryRun'],
      { cwd: project.baseDir }
    );

    expect(result.stdout).toContain(
      `This application is already on the latest version of TypeScript@${fixtureTSCVersion}`
    );
  });
});
