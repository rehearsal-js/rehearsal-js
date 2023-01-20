import { resolve, join } from 'path';
import { ESLint } from 'eslint';
import { glob } from 'glob';
import { outputFileSync } from 'fs-extra';
import defaultConfig from '../../../configs/default-eslint';
import { gitAddIfInRepo } from '../../../utils';
import type { ListrTask } from 'listr2';
import type { MigrateCommandContext, MigrateCommandOptions } from '../../../types';

const REHEARSAL_CONFIG_FILENAME = '.rehearsal-eslintrc.js';
const REHEARSAL_CONFIG_RELATIVE_PATH = `./${REHEARSAL_CONFIG_FILENAME}`;

export async function lintConfigTask(options: MigrateCommandOptions): Promise<ListrTask> {
  return {
    title: 'Create eslint config',
    enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
    task: async (_ctx: MigrateCommandContext, task): Promise<void> => {
      // glob against the following file extension pattern js,yml,json,yaml and return the first match
      const configPath = glob.sync(join(options.basePath, '.eslintrc.{js,yml,json,yaml}'))[0];

      if (_ctx.userConfig?.hasLintSetup) {
        task.output = `Create .eslintrc.js from config`;
        await _ctx.userConfig.lintSetup();
      } else {
        // only run the default process with no custom config provided
        // create .rehearsal-eslintrc.js
        createRehearsalConfig(options.basePath);

        if (configPath) {
          task.output = `${configPath} already exists, extending Rehearsal default typescript-related config`;
          task.title = `Update eslintrc.js`;
          await extendsRehearsalInCurrentConfig(configPath, REHEARSAL_CONFIG_RELATIVE_PATH);
        } else {
          task.output = `Create .eslintrc.js, extending Rehearsal default typescript-related config`;
          extendsRehearsalInNewConfig(options.basePath, REHEARSAL_CONFIG_RELATIVE_PATH);
        }
      }
    },
  };
}

function createRehearsalConfig(basePath: string): void {
  const rehearsalConfigStr = 'module.exports = ' + JSON.stringify(defaultConfig, null, 2);
  const rehearsalConfigPath = resolve(basePath, REHEARSAL_CONFIG_FILENAME);
  outputFileSync(rehearsalConfigPath, rehearsalConfigStr);
  gitAddIfInRepo(rehearsalConfigPath); // stage '.rehearsal-eslintrc.js'; if in a git repo
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
  basePath: string,
  rehearsalConfigRelativePath: string
): Promise<void> {
  const configPath = resolve(basePath, '.eslintrc.js');
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
  gitAddIfInRepo(path); // stage .eslintrc.js if in a git repo
}

async function formatLintConfig(configStr: string, filePath: string): Promise<string | undefined> {
  const eslint = new ESLint({ fix: true, useEslintrc: true });
  const [report] = await eslint.lintText(configStr, { filePath: filePath });
  return report.output;
}
