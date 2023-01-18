import { resolve } from 'path';
import { ESLint } from 'eslint';
import { existsSync, outputFileSync } from 'fs-extra';
import defaultConfig from '../../../configs/default-eslint';
import type { ListrTask } from 'listr2';
import type { MigrateCommandContext, MigrateCommandOptions } from '../../../types';

const CONFIG_FILENAME = '.eslintrc.js';
const REHEARSAL_CONFIG_FILENAME = '.rehearsal-eslintrc.js';
const REHEARSAL_CONFIG_RELATIVE_PATH = `./${REHEARSAL_CONFIG_FILENAME}`;

export async function lintConfigTask(options: MigrateCommandOptions): Promise<ListrTask> {
  return {
    title: 'Create eslint config',
    enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
    task: async (_ctx: MigrateCommandContext, task): Promise<void> => {
      if (_ctx.userConfig?.hasLintSetup) {
        task.output = `Create .eslintrc.js from config`;
        await _ctx.userConfig.lintSetup();
      } else {
        // only run the default process with no custom config provided
        createRehearsalConfig(options.basePath);

        const configPath = resolve(options.basePath, CONFIG_FILENAME);

        if (configExists(configPath)) {
          task.output = `${configPath} already exists, extending Rehearsal default typescript-related config`;
          task.title = `Update eslintrc.js`;
          await extendsRehearsalInCurrentConfig(configPath, REHEARSAL_CONFIG_RELATIVE_PATH);
        } else {
          task.output = `Create .eslintrc.js, extending Rehearsal default typescript-related config`;
          extendsRehearsalInNewConfig(configPath, REHEARSAL_CONFIG_RELATIVE_PATH);
        }
      }
    },
  };
}

function createRehearsalConfig(basePath: string): void {
  const rehearsalConfigStr = 'module.exports = ' + JSON.stringify(defaultConfig, null, 2);
  const rehearsalConfigPath = resolve(basePath, REHEARSAL_CONFIG_FILENAME);
  outputFileSync(rehearsalConfigPath, rehearsalConfigStr);
}

async function extendsRehearsalInCurrentConfig(
  configPath: string,
  rehearsalConfigRelativePath: string
): Promise<void> {
  /* eslint-disable-next-line @typescript-eslint/no-var-requires */
  const oldConfig = require(configPath);
  const newConfig = {
    ...oldConfig,
    extends: [...oldConfig.extends, rehearsalConfigRelativePath],
  };
  const configStr = `
  module.exports = ${JSON.stringify(newConfig, null, 2)}
  `;
  await writeLintConfig(configPath, configStr);
}

async function extendsRehearsalInNewConfig(
  configPath: string,
  rehearsalConfigRelativePath: string
): Promise<void> {
  const configStr = `
  module.exports = {
    extends: ['${rehearsalConfigRelativePath}']
  }
  `;
  await writeLintConfig(configPath, configStr);
}

async function writeLintConfig(path: string, config: string): Promise<void> {
  outputFileSync(path, config);
  const formattedConfig = await formatLintConfig(config, path);
  outputFileSync(path, formattedConfig);
}

async function formatLintConfig(configStr: string, filePath: string): Promise<string | undefined> {
  const eslint = new ESLint({ fix: true, useEslintrc: true });
  const [report] = await eslint.lintText(configStr, { filePath: filePath });
  return report.output;
}

function configExists(configPath: string): boolean {
  return existsSync(configPath);
}
