import { resolve } from 'node:path';
import { promises as fs, readdirSync, readFileSync } from 'node:fs';
import { writeJSONSync } from 'fs-extra/esm';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { getFiles } from '@rehearsal/test-support';
import yaml from 'js-yaml';
import { Project } from 'fixturify-project';
import { readTSConfig } from '@rehearsal/utils';
import { REQUIRED_DEPENDENCIES } from '../../../src/commands/migrate/tasks/dependency-install.js';

import { cleanOutput, prepareProject, runBin } from '../../test-helpers/index.js';
import { CustomConfig } from '../../../src/types.js';
import type { PackageJson } from 'type-fest';

describe('migrate - validation', () => {
  let project: Project;

  afterEach(() => {
    project.dispose();
  });

  test('pass in a clean project', async () => {
    project = prepareProject('initialization');

    await project.write();

    const { stdout } = await runBin('migrate', ['--ci'], {
      cwd: project.baseDir,
    });

    expect(stdout).toContain('Migration Complete');
  });

  test('throw if not in project root with npm/yarn workspaces', async () => {
    project = new Project('workspaces');

    project.pkg.workspaces = ['packages/*'];
    project.files = {
      packages: {
        'package-a': {
          'package.json': JSON.stringify({
            name: 'package-a',
            version: '1.0.0',
          }),
        },
      },
    };

    await project.write();

    const { stdout } = await runBin('migrate', ['--ci'], {
      cwd: resolve(project.baseDir, 'packages', 'package-a'),
    });

    expect(stdout).toContain('migrate command needs to be running at project root with workspaces');
  });

  test('not throw if in project root with unrelated npm/yarn workspaces', async () => {
    project = new Project('workspaces-with-error');
    project.files = {
      'package.json': JSON.stringify({
        workspaces: ['packages/lib/*'],
      }),
      packages: {
        'package-a': {
          'package.json': JSON.stringify({
            name: 'package-a',
            version: '1.0.0',
          }),
        },
      },
    };

    await project.write();

    const { stdout: secondRunStdout } = await runBin('migrate', ['--ci'], {
      cwd: resolve(project.baseDir, 'packages', 'package-a'),
    });
    expect(cleanOutput(secondRunStdout, project.baseDir)).toMatchSnapshot();
  });

  test('throw if not in project root with pnpm workspaces', async () => {
    project = new Project('workspaces-with-pnpm-error');

    project.files = {
      'package.json': JSON.stringify({
        name: 'foo',
      }),
      'pnpm-lock.yaml': '',
      'pnpm-workspace.yaml': yaml.dump({ packages: ['packages/*'] }),
      packages: {
        'package-a': {
          'package.json': JSON.stringify({
            name: 'package-a',
            version: '1.0.0',
          }),
        },
      },
    };

    await project.write();

    const { stdout } = await runBin('migrate', ['--ci'], {
      cwd: resolve(project.baseDir, 'packages', 'package-a'),
    });
    expect(stdout).toContain('migrate command needs to be running at project root with workspaces');
  });

  test('not throw if in project root with unrelated npm/yarn workspaces', async () => {
    project = new Project('workspaces-with-pnpm-error');
    project.files = {
      'package.json': JSON.stringify({
        name: 'foo',
      }),
      'pnpm-lock.yaml': '',
      'pnpm-workspace.yaml': yaml.dump({ packages: ['packages/lib/*'] }),
      packages: {
        'package-a': {
          'package.json': JSON.stringify({
            name: 'package-a',
            version: '1.0.0',
          }),
        },
      },
    };

    await project.write();

    const { stdout: secondRunStdout } = await runBin('migrate', ['--ci'], {
      cwd: resolve(project.baseDir, 'packages', 'package-a'),
    });
    expect(cleanOutput(secondRunStdout, project.baseDir)).toMatchSnapshot();
  });

  test('relative entrypoint inside project root works', async () => {
    project = prepareProject('basic');

    // we validate that this gets created
    delete project.files['tsconfig.json'];

    await project.write();

    const { stdout } = await runBin('migrate', ['-e', 'foo.js', '--ci'], {
      cwd: project.baseDir,
    });
    expect(cleanOutput(stdout, project.baseDir)).toMatchSnapshot();
  });

  test('absolute entrypoint inside project root works', async () => {
    project = prepareProject('basic');

    // we validate that this gets created
    delete project.files['tsconfig.json'];

    await project.write();

    const { stdout } = await runBin('migrate', ['-e', resolve(project.baseDir, 'foo.js'), '--ci'], {
      cwd: project.baseDir,
    });
    expect(cleanOutput(stdout, project.baseDir)).toMatchSnapshot();
  });

  test('entrypoint outside project root does not work', async () => {
    project = prepareProject('basic');

    await project.write();

    const { stdout } = await runBin('migrate', ['-e', resolve(__dirname, 'e2e.test.ts'), '--ci'], {
      cwd: project.baseDir,
    });
    expect(stdout).toContain('Could not find entrypoint');
  });
});

describe('migrate: e2e', () => {
  let project: Project;
  beforeEach(async () => {
    project = prepareProject('basic');
    await project.write();
  });

  test('default migrate command', async () => {
    const { stdout } = await runBin('migrate', ['--ci'], {
      cwd: project.baseDir,
    });

    // summary message
    expect(cleanOutput(stdout, project.baseDir)).toMatchSnapshot();

    // file structures
    const fileList = readdirSync(project.baseDir);
    expect(fileList).toContain('index.ts');
    expect(fileList).toContain('foo.ts');
    expect(fileList).toContain('depends-on-foo.ts');
    expect(fileList).not.toContain('index.js');
    expect(fileList).not.toContain('foo.js');
    expect(fileList).not.toContain('depends-on-foo.js');

    // file contents
    expect(
      readFileSync(resolve(project.baseDir, 'foo.ts'), { encoding: 'utf-8' })
    ).toMatchSnapshot();
    expect(
      readFileSync(resolve(project.baseDir, 'depends-on-foo.ts'), { encoding: 'utf-8' })
    ).toMatchSnapshot();
    expect(
      readFileSync(resolve(project.baseDir, 'index.ts'), { encoding: 'utf-8' })
    ).toMatchSnapshot();

    // Dependencies
    const packageJson = JSON.parse(
      await fs.readFile(resolve(project.baseDir, 'package.json'), 'utf-8')
    ) as PackageJson;

    const devDeps = packageJson.devDependencies;
    expect(Object.keys(devDeps || {}).sort()).toEqual(REQUIRED_DEPENDENCIES.sort());

    // report
    const reportPath = resolve(project.baseDir, '.rehearsal');
    expect(readdirSync(reportPath)).toContain('migrate-report.sarif');

    // tsconfig.json
    const tsConfig = readTSConfig(resolve(project.baseDir, 'tsconfig.json'));
    expect(tsConfig).matchSnapshot();

    // lint config
    expect(fileList).toContain('.eslintrc.js');
    expect(fileList).toContain('.rehearsal-eslintrc.js');
    const lintConfig = readFileSync(resolve(project.baseDir, '.eslintrc.js'), {
      encoding: 'utf-8',
    });
    const lintConfigDefault = readFileSync(resolve(project.baseDir, '.rehearsal-eslintrc.js'), {
      encoding: 'utf-8',
    });
    expect(lintConfig).toMatchSnapshot();
    expect(lintConfigDefault).toMatchSnapshot();

    // new scripts
    expect(packageJson?.scripts?.['lint:tsc']).toBe('tsc --noEmit');
  });

  test('migrate would skip steps after migrate init', async () => {
    // migrate init
    await runBin('migrate', ['init'], {
      cwd: project.baseDir,
    });

    let fileList = readdirSync(project.baseDir);

    // Dependencies
    const packageJson = JSON.parse(
      await fs.readFile(resolve(project.baseDir, 'package.json'), 'utf-8')
    ) as PackageJson;
    const devDeps = packageJson.devDependencies;
    expect(Object.keys(devDeps || {}).sort()).toEqual(REQUIRED_DEPENDENCIES.sort());

    // tsconfig.json
    const tsConfig = readTSConfig(resolve(project.baseDir, 'tsconfig.json'));
    expect(tsConfig).matchSnapshot();

    // lint config
    expect(fileList).toContain('.eslintrc.js');
    expect(fileList).toContain('.rehearsal-eslintrc.js');
    const lintConfig = readFileSync(resolve(project.baseDir, '.eslintrc.js'), {
      encoding: 'utf-8',
    });
    const lintConfigDefault = readFileSync(resolve(project.baseDir, '.rehearsal-eslintrc.js'), {
      encoding: 'utf-8',
    });
    expect(lintConfig).toMatchSnapshot();
    expect(lintConfigDefault).toMatchSnapshot();

    // new scripts
    expect(packageJson?.scripts?.['lint:tsc']).toBe('tsc --noEmit');

    // run migrate
    const { stdout } = await runBin('migrate', ['--ci'], {
      cwd: project.baseDir,
    });
    // migrate init output
    expect(cleanOutput(stdout, project.baseDir)).toMatchSnapshot();

    // read files again
    fileList = readdirSync(project.baseDir);
    // file structures
    expect(fileList).toContain('index.ts');
    expect(fileList).toContain('foo.ts');
    expect(fileList).toContain('depends-on-foo.ts');
    expect(fileList).not.toContain('index.js');
    expect(fileList).not.toContain('foo.js');
    expect(fileList).not.toContain('depends-on-foo.js');

    // file contents
    expect(
      readFileSync(resolve(project.baseDir, 'foo.ts'), { encoding: 'utf-8' })
    ).toMatchSnapshot();
    expect(
      readFileSync(resolve(project.baseDir, 'depends-on-foo.ts'), { encoding: 'utf-8' })
    ).toMatchSnapshot();
    expect(
      readFileSync(resolve(project.baseDir, 'index.ts'), { encoding: 'utf-8' })
    ).toMatchSnapshot();

    // report
    const reportPath = resolve(project.baseDir, '.rehearsal');
    expect(readdirSync(reportPath)).toContain('migrate-report.sarif');
  });

  test('--skip-init option', async () => {
    // run migrate with --skip-init
    // this command should fail
    expect.assertions(1);
    try {
      const { stdout } = await runBin('migrate', ['--skip-init', '--ci'], {
        cwd: project.baseDir,
      });
      // validate -> initialize -> analyze -> convert
      const expected = [
        '[STARTED] Validate project',
        '[SUCCESS] Validate project',
        '[STARTED] Initialize',
        '[DATA] Setting up config for initialization',
        '[SUCCESS] Initialize',
        '[STARTED] Analyzing Project',
        '[DATA] Running migration on initialization',
        '[SUCCESS] Analyzing Project',
        '[STARTED] Convert JS files to TS`;',
      ].join('\n');
      expect(stdout).toContain(expected);
    } catch (e) {
      // no-ops
    }
  });

  test('Print debug messages with --verbose', async () => {
    const { stdout } = await runBin('migrate', ['--verbose', '--ci'], {
      cwd: project.baseDir,
    });

    expect(cleanOutput(stdout, project.baseDir)).toMatchSnapshot();
  });

  test('show warning message for missing config with --regen', async () => {
    const project = prepareProject('basic_regen');
    delete project.files['tsconfig.json'];

    await project.write();
    // this test expect a fixture app without tsconfig.json and eslint config
    const { stdout, stderr } = await runBin('migrate', ['-r', '--ci'], {
      cwd: project.baseDir,
    });
    expect(stdout).toContain('Eslint config (.eslintrc.{js,yml,json,yaml}) does not exist');
    expect(stdout).toContain('tsconfig.json does not exist');
    expect(stderr).toContain(`Config file 'tsconfig.json' not found`);
  });

  test('regen result after the first pass', async () => {
    // first run without --regen
    await runBin('migrate', ['--ci'], {
      cwd: project.baseDir,
    });
    const { stdout } = await runBin('migrate', ['-r', '--ci'], {
      cwd: project.baseDir,
    });
    expect(cleanOutput(stdout, project.baseDir)).toMatchSnapshot();
  });

  describe('user defined options passed by --user-config -u', () => {
    function createUserConfig(basePath: string, config: CustomConfig): void {
      const configPath = resolve(basePath, 'rehearsal-config.json');
      writeJSONSync(configPath, config);
    }

    test('migrate.exclude', async () => {
      const files = getFiles('simple');
      // Add a directory that we don't want to ignore
      files['some-dir'] = { 'index.js': '// I should be excluded ' };
      const project = new Project('my-package');
      project.files = files;

      await project.write();

      createUserConfig(project.baseDir, {
        migrate: {
          setup: {
            ts: { command: 'touch', args: ['custom-ts-config-script'] },
          },
          exclude: ['some-dir'],
        },
      });

      const result = await runBin('migrate', ['-d', '-u', 'rehearsal-config.json', '--ci'], {
        cwd: project.baseDir,
      });

      const expected = [
        '[STARTED] Initialize',
        '[DATA] Setting up config for my-package',
        '[SUCCESS] Initialize',
        '[STARTED] Analyzing Project',
        '[DATA] Running migration on my-package',
        '[DATA] List of files will be attempted to migrate:',
        '[DATA]  lib/a.js',
        '[DATA] index.js',
        '[SUCCESS] Analyzing Project',
      ].join('\n');

      expect(result.stdout).contains(expected);
      // need this here since we are using a local project
      project.dispose();
    });

    test('migrate.include', async () => {
      const files = getFiles('simple');

      // test is a default ignored directory in Package.ts
      // adding it to the include list should override that value.
      files['test'] = { 'index.js': '// I should be included ' };
      const project = new Project('my-package');

      project.files = files;
      await project.write();
      createUserConfig(project.baseDir, {
        migrate: {
          setup: {
            ts: { command: 'touch', args: ['custom-ts-config-script'] },
          },
          include: ['test'],
        },
      });

      const result = await runBin('migrate', ['-d', '-u', 'rehearsal-config.json', '--ci'], {
        cwd: project.baseDir,
      });
      const expected = [
        '[STARTED] Initialize',
        '[DATA] Setting up config for my-package',
        '[SUCCESS] Initialize',
        '[STARTED] Analyzing Project',
        '[DATA] Running migration on my-package',
        '[DATA] List of files will be attempted to migrate:',
        '[DATA]  lib/a.js',
        '[DATA] index.js',
        '[DATA] test/index.js',
        '[SUCCESS] Analyzing Project',
      ].join('\n');

      expect(result.stdout).contains(expected);
      // need this here since we are using a local project
      project.dispose();
    });
  });
});
