import { resolve } from 'path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { writeJSONSync, readdirSync, writeFileSync } from 'fs-extra';
import { type SimpleGit, simpleGit, type SimpleGitOptions } from 'simple-git';

import { depInstallTask, lintConfigTask } from '../../../src/commands/migrate/tasks';
import { prepareTmpDir, ListrTaskRunner, createMigrateOptions } from '../../test-helpers';
import { CustomConfig } from '../../../src/types';
import { UserConfig } from '../../../src/user-config';

function createUserConfig(basePath: string, config: CustomConfig): void {
  const configPath = resolve(basePath, 'rehearsal-config.json');
  writeJSONSync(configPath, config);
}

describe('Task: config-lint', async () => {
  let basePath = '';
  let output = '';
  vi.spyOn(console, 'info').mockImplementation((chunk) => {
    output += `${chunk}\n`;
  });
  vi.spyOn(console, 'log').mockImplementation((chunk) => {
    output += `${chunk}\n`;
  });

  beforeEach(() => {
    output = '';
    basePath = prepareTmpDir('initialization');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('create .eslintrc if not existed', async () => {
    const options = createMigrateOptions(basePath);
    // lint task requires dependencies installed first
    const tasks = [await depInstallTask(options), await lintConfigTask(options)];
    const runner = new ListrTaskRunner(tasks);
    await runner.run();

    expect(readdirSync(basePath)).toContain('.eslintrc.js');
    expect(readdirSync(basePath)).toContain('.rehearsal-eslintrc.js');
    expect(output).matchSnapshot();
  });

  test('extends .eslintrc if existed', async () => {
    // prepare old .eslintrc.js
    const oldConfig = `
    module.exports = {extends: []};
  `;
    writeFileSync(resolve(basePath, '.eslintrc.js'), oldConfig);

    const options = createMigrateOptions(basePath);
    // lint task requires dependencies installed first
    const tasks = [await depInstallTask(options), await lintConfigTask(options)];
    const runner = new ListrTaskRunner(tasks);
    await runner.run();

    expect(readdirSync(basePath)).toContain('.eslintrc.js');
    expect(readdirSync(basePath)).toContain('.rehearsal-eslintrc.js');
    // Do not use snapshot here since there is absolute path in output
    expect(output).toContain('extending Rehearsal default typescript-related config');

    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const newConfig = require(resolve(basePath, '.eslintrc.js'));
    expect(newConfig.extends).toStrictEqual(['./.rehearsal-eslintrc.js']);
  });

  test('run custom config command with user config provided', async () => {
    createUserConfig(basePath, {
      migrate: {
        setup: {
          lint: { command: 'touch', args: ['custom-lint-config-script'] },
        },
      },
    });

    const options = createMigrateOptions(basePath, { userConfig: 'rehearsal-config.json' });
    const userConfig = new UserConfig(basePath, 'rehearsal-config.json', 'migrate');
    const tasks = [await depInstallTask(options), await lintConfigTask(options)];
    const runner = new ListrTaskRunner(tasks, { userConfig });
    await runner.run();

    // This proves the custom command works
    expect(readdirSync(basePath)).toContain('custom-lint-config-script');
    expect(output).toMatchSnapshot();
  });

  test('stage .eslintrc if in git repo', async () => {
    // simulate clean git project
    const git: SimpleGit = simpleGit({
      baseDir: basePath,
    } as Partial<SimpleGitOptions>);
    // Init git, add and commit existed files, to make it a clean state
    await git.init();
    await git.add(resolve(basePath, 'package.json'));
    // GH CI would require git name and email
    await git.addConfig('user.name', 'tester');
    await git.addConfig('user.email', 'tester@tester.com');
    await git.commit('foo');

    const options = createMigrateOptions(basePath);
    // lint task requires dependencies installed first
    const tasks = [await depInstallTask(options), await lintConfigTask(options)];
    const runner = new ListrTaskRunner(tasks);
    await runner.run();

    expect(readdirSync(basePath)).toContain('.eslintrc.js');
    expect(readdirSync(basePath)).toContain('.rehearsal-eslintrc.js');

    const gitStatus = await git.status();
    expect(gitStatus.staged).toContain('.eslintrc.js');
    expect(gitStatus.staged).toContain('.rehearsal-eslintrc.js');
  });
});
