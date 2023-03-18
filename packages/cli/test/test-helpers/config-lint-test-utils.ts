import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { writeJSONSync } from 'fs-extra/esm';

import { depInstallTask, lintConfigTask } from '../../src/commands/migrate/tasks/index.js';
import { CustomConfig } from '../../src/types.js';
import { UserConfig } from '../../src/user-config.js';
import { listrTaskRunner, createMigrateOptions } from './index.js';

export async function createLintConfig(basePath: string): Promise<void> {
  const options = createMigrateOptions(basePath);
  const tasks = [depInstallTask(options), lintConfigTask(options)];
  await listrTaskRunner(tasks);
}

export async function extendLintConfig(
  oldConfig: string,
  basePath: string,
  configFile: string
): Promise<void> {
  writeFileSync(resolve(basePath, configFile), oldConfig);

  const options = createMigrateOptions(basePath);
  // lint task requires dependencies installed first
  const tasks = [depInstallTask(options), lintConfigTask(options)];
  await listrTaskRunner(tasks);
}

export async function skipConfigThatExtends(
  oldConfig: string,
  basePath: string,
  configFile: string
): Promise<void> {
  writeFileSync(resolve(basePath, configFile), oldConfig);
  writeFileSync(resolve(basePath, '.rehearsal-eslintrc.js'), '');

  const options = createMigrateOptions(basePath);
  // this validation does not need depInstallTask
  const tasks = [lintConfigTask(options)];
  await listrTaskRunner(tasks);
}

function createUserConfig(basePath: string, config: CustomConfig): void {
  const configPath = resolve(basePath, 'rehearsal-config.json');
  writeJSONSync(configPath, config);
}
export async function createCustomLintConfig(
  basePath: string,
  customConfig: CustomConfig
): Promise<void> {
  createUserConfig(basePath, customConfig);
  const options = createMigrateOptions(basePath, { userConfig: 'rehearsal-config.json' });
  const userConfig = new UserConfig(basePath, 'rehearsal-config.json', 'migrate');
  const tasks = [depInstallTask(options), lintConfigTask(options, { userConfig })];
  await listrTaskRunner(tasks);
}

export async function skipCustomConfigThatExtends(
  basePath: string,
  customConfig: CustomConfig
): Promise<void> {
  const oldConfig = `
    module.exports = {extends: ["./.rehearsal-eslintrc.js"]};
  `;
  writeFileSync(resolve(basePath, '.eslintrc.js'), oldConfig);

  createUserConfig(basePath, customConfig);

  const options = createMigrateOptions(basePath, { userConfig: 'rehearsal-config.json' });
  const userConfig = new UserConfig(basePath, 'rehearsal-config.json', 'migrate');
  const tasks = [lintConfigTask(options, { userConfig })];
  await listrTaskRunner(tasks);
}
