import { dirname, join, resolve } from 'node:path';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { vi, afterEach, beforeEach, describe, expect, test } from 'vitest';
import { readTSConfig, getLatestTSVersion } from '@rehearsal/utils';
import { simpleGit, type SimpleGitOptions } from 'simple-git';
import { createLogger, format, transports } from 'winston';
import { readJSONSync } from 'fs-extra/esm';
import { execa } from 'execa';
import { convertTask, graphTask, initTask } from '../../../src/commands/fix/tasks/index.js';
import {
  prepareProject,
  listrTaskRunner,
  createMigrateOptions,
  KEYS,
  sendKey,
  removeSpecialChars,
  createOutputStream,
  isPackageSelection,
  isActionSelection,
  runBin,
} from '../../test-helpers/index.js';

import type { TSConfig } from '../../../src/types.js';
import type { Project } from 'fixturify-project';
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

const logger = createLogger({
  transports: [new transports.Console({ format: format.cli() })],
});

describe('Task: convert', () => {
  let output = '';
  let project: Project;
  let outputStream = createOutputStream();
  vi.spyOn(console, 'info').mockImplementation((chunk) => {
    output += `${chunk}\n`;
    outputStream.push(`${chunk}\n`);
  });
  vi.spyOn(console, 'log').mockImplementation((chunk) => {
    output += `${chunk}\n`;
    outputStream.push(`${chunk}\n`);
  });
  vi.spyOn(console, 'error').mockImplementation((chunk) => {
    output += `${chunk}\n`;
    outputStream.push(`${chunk}\n`);
  });

  beforeEach(async () => {
    output = '';
    project = prepareProject('basic');
    // these test for the creation of tsconfig.json
    delete project.files['tsconfig.json'];
    await project.write();
    outputStream = createOutputStream();
  });

  afterEach(() => {
    output = '';
    vi.clearAllMocks();
    outputStream.destroy();
    project.dispose();
  });

  test('migrate from default all files .js in root', async () => {
    const options = createMigrateOptions(project.baseDir, { ci: true });
    // Get context for convert task from previous tasks
    const tasks = [
      initTask(options),
      depInstallTask(options),
      tsConfigTask(options),
      lintConfigTask(options),
      analyzeTask(options),
      convertTask(options, logger),
    ];
    await listrTaskRunner(tasks);

    expect(output).toMatchSnapshot();

    const fileList = readdirSync(project.baseDir);
    expect(fileList).toContain('index.ts');
    expect(fileList).toContain('foo.ts');
    expect(fileList).toContain('depends-on-foo.ts');
    expect(fileList).not.toContain('index.js');
    expect(fileList).not.toContain('foo.js');
    expect(fileList).not.toContain('depends-on-foo.js');

    const config = readTSConfig<TSConfig>(resolve(project.baseDir, 'tsconfig.json'));
    expect(config.include).toContain('index.ts');
    expect(config.include).toContain('foo.ts');
    expect(config.include).toContain('depends-on-foo.ts');
  });

  test('migrate from specific entrypoint', async () => {
    const options = createMigrateOptions(project.baseDir, {
      entrypoint: 'depends-on-foo.js',
      ci: true,
    });
    // Get context for convert task from previous tasks
    const tasks = [
      initTask(options),
      depInstallTask(options),
      tsConfigTask(options),
      lintConfigTask(options),
      analyzeTask(options),
      convertTask(options, logger),
    ];
    await listrTaskRunner(tasks);

    expect(output).toMatchSnapshot();

    const fileList = readdirSync(project.baseDir);
    expect(fileList).toContain('depends-on-foo.ts');
    expect(fileList).toContain('foo.ts');

    expect(fileList).not.toContain('depends-on-foo.js');
    expect(fileList).not.toContain('foo.js');

    const config = readTSConfig<TSConfig>(resolve(project.baseDir, 'tsconfig.json'));
    expect(config.include).toContain('depends-on-foo.ts');
    expect(config.include).toContain('foo.ts');
  });

  test('generate reports', async () => {
    const options = createMigrateOptions(project.baseDir, {
      format: ['json', 'md', 'sarif'],
      ci: true,
    });
    // Get context for convert task from previous tasks
    const tasks = [
      initTask(options),
      depInstallTask(options),
      tsConfigTask(options),
      lintConfigTask(options),
      analyzeTask(options),
      convertTask(options, logger),
    ];
    await listrTaskRunner(tasks);

    expect(output).toMatchSnapshot();

    const reportPath = resolve(project.baseDir, '.rehearsal');
    const reportList = readdirSync(reportPath);

    expect(reportList).toContain('migrate-report.json');
    expect(reportList).toContain('migrate-report.md');
    expect(reportList).toContain('migrate-report.sarif');
  });

  test('accept changes without git', async () => {
    const options = createMigrateOptions(project.baseDir);

    // prompt control flow
    outputStream.on('data', (line: string) => {
      // selection package
      if (isPackageSelection(line)) {
        sendKey(KEYS.ENTER);
      }
      if (isActionSelection(line)) {
        // select Accept for all 3 files
        sendKey(KEYS.ENTER); // selection package
      }
    });
    // Get context for convert task from previous tasks
    const tasks = [
      initTask(options),
      depInstallTask(options),
      tsConfigTask(options),
      lintConfigTask(options),
      analyzeTask(options),
      convertTask(options, logger),
    ];

    await listrTaskRunner(tasks);

    const outputWithoutTmpPath = output.replace(new RegExp(project.baseDir, 'g'), '<tmp-path>');
    expect(removeSpecialChars(outputWithoutTmpPath)).toMatchSnapshot();

    const fileList = readdirSync(project.baseDir);
    expect(fileList).toContain('index.ts');
    expect(fileList).toContain('foo.ts');
    expect(fileList).toContain('depends-on-foo.ts');
    expect(fileList).not.toContain('index.js');
    expect(fileList).not.toContain('foo.js');
    expect(fileList).not.toContain('depends-on-foo.js');
  });

  test('accept and discard changes with git', async () => {
    // simulate clean git project
    const git = simpleGit({
      baseDir: project.baseDir,
    } as Partial<SimpleGitOptions>);
    await git
      .init()
      .addConfig('user.name', 'tester')
      .addConfig('user.email', 'tester@tester.com')
      .add('./*')
      .commit('first commit!');

    const options = createMigrateOptions(project.baseDir);
    let fileCount = 1; // file counter in prompt selection

    // prompt control flow
    outputStream.on('data', (line: string) => {
      if (isPackageSelection(line)) {
        // selection package
        sendKey(KEYS.ENTER);
      }
      if (isActionSelection(line)) {
        switch (fileCount) {
          case 1:
            // At action selection for foo.js
            sendKey(KEYS.ENTER); // accept
            break;
          case 2:
            // At action selection for depends-on-foo.js
            sendKey(KEYS.ENTER); // accept
            break;
          case 3:
            // At action selection for index.js
            sendKey(KEYS.DOWN);
            sendKey(KEYS.DOWN);
            sendKey(KEYS.ENTER); // discard
            break;
        }
        fileCount++;
      }
    });

    // Get context for convert task from previous tasks
    const tasks = [
      initTask(options),
      depInstallTask(options),
      tsConfigTask(options),
      lintConfigTask(options),
      analyzeTask(options),
      convertTask(options, logger),
    ];

    await listrTaskRunner(tasks);

    const outputWithoutTmpPath = output.replace(new RegExp(project.baseDir, 'g'), '<tmp-path>');
    expect(removeSpecialChars(outputWithoutTmpPath)).toMatchSnapshot();

    const fileList = readdirSync(project.baseDir);
    // index.ts should been discarded
    expect(fileList).toContain('index.js');
    expect(fileList).toContain('foo.ts');
    expect(fileList).toContain('depends-on-foo.ts');
    expect(fileList).not.toContain('index.ts');
    expect(fileList).not.toContain('foo.js');
    expect(fileList).not.toContain('depends-on-foo.js');
  });

  test('view changes in $EDITOR', async () => {
    // TODO: It is super complicated to test this in real editor
    // 1. It is not promised that every machine has the editor defined here
    // 2. Haven't figured out how to pass key command/press to editor, to edit file and quit the edit
    // 3. Also tried EDITOR = 'echo foo >>', to append string to a file so we know it would change, but it doesn't work (probably related to all stdio config)
    // For now EDITOR is set to be 'rm', which would remove the selected file so we know the edit command works
    process.env['EDITOR'] = 'rm';
    const options = createMigrateOptions(project.baseDir);

    let fileCount = 1; // file counter in prompt selection

    // prompt control flow
    outputStream.on('data', (line: string) => {
      if (isPackageSelection(line)) {
        // selection package
        sendKey(KEYS.ENTER);
      }
      if (isActionSelection(line)) {
        switch (fileCount) {
          case 1:
            // At action selection for foo.js
            sendKey(KEYS.ENTER); // accept
            break;
          case 2:
            // At action selection for depends-on-foo.js
            sendKey(KEYS.ENTER); // accept
            break;
          case 3:
            // At action selection for index.js
            sendKey(KEYS.DOWN);
            sendKey(KEYS.ENTER); // edit
            break;
        }
        fileCount++;
      }
    });
    // Get context for convert task from previous tasks
    const tasks = [
      initTask(options),
      depInstallTask(options),
      tsConfigTask(options),
      lintConfigTask(options),
      analyzeTask(options),
      convertTask(options, logger),
    ];

    await listrTaskRunner(tasks);

    const outputWithoutTmpPath = output.replace(new RegExp(project.baseDir, 'g'), '<tmp-path>');
    expect(removeSpecialChars(outputWithoutTmpPath)).toMatchSnapshot();

    const fileList = readdirSync(project.baseDir);
    // // index.ts should been removed
    expect(fileList).not.toContain('index.ts');
    expect(fileList).toContain('foo.ts');
    expect(fileList).toContain('depends-on-foo.ts');
    expect(fileList).not.toContain('index.js');
    expect(fileList).not.toContain('foo.js');
    expect(fileList).not.toContain('depends-on-foo.js');
  });

  test('cancel prompt in interactive mode', async () => {
    const options = createMigrateOptions(project.baseDir);

    // prompt control flow
    outputStream.on('data', (line: string) => {
      // selection package
      if (isPackageSelection(line)) {
        sendKey(KEYS.ENTER);
      }
      if (isActionSelection(line)) {
        // At action selection for foo.js
        sendKey(KEYS.CTRL_C); // cancel
      }
    });

    // Get context for convert task from previous tasks
    const tasks = [
      initTask(options),
      depInstallTask(options),
      tsConfigTask(options),
      lintConfigTask(options),
      analyzeTask(options),
      convertTask(options, logger),
    ];

    // use try catch since it would be killed via ctrl c
    await listrTaskRunner(tasks).catch(() => {
      // replace random tmp path for consistent snapshot
      const outputWithoutTmpPath = output.replace(new RegExp(project.baseDir, 'g'), '<tmp-path>');
      expect(removeSpecialChars(outputWithoutTmpPath)).toMatchSnapshot();
    });
  });
});

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
