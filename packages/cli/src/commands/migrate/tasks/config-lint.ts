import { resolve } from 'path';
import { ESLint } from 'eslint';
import { outputFileSync } from 'fs-extra';
import { cosmiconfigSync } from 'cosmiconfig';
import defaultConfig from '../../../configs/default-eslint';
import { gitAddIfInRepo, getEsLintConfigPath, determineProjectName } from '../../../utils';
import type { ListrTask } from 'listr2';
import type { MigrateCommandContext, MigrateCommandOptions } from '../../../types';

const REHEARSAL_CONFIG_FILENAME = '.rehearsal-eslintrc.js';
const REHEARSAL_CONFIG_RELATIVE_PATH = `./${REHEARSAL_CONFIG_FILENAME}`;

export async function lintConfigTask(
  options: MigrateCommandOptions,
  context?: Partial<MigrateCommandContext>
): Promise<ListrTask> {
  return {
    title: 'Create eslint config',
    enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
    task: async (ctx: MigrateCommandContext, task): Promise<void> => {
      // If context is provide via external parameter, merge with existed
      if (context) {
        ctx = { ...ctx, ...context };
      }
      const relativeConfigPath = getEsLintConfigPath(options.basePath);

      if (ctx.userConfig?.hasLintSetup) {
        task.output = `Create .eslintrc.js from config`;
        await ctx.userConfig.lintSetup();
      } else {
        // only run the default process with no custom config provided
        // create .rehearsal-eslintrc.js
        await createRehearsalConfig(options.basePath);

        if (relativeConfigPath) {
          task.output = `${relativeConfigPath} already exists, extending Rehearsal default typescript-related config`;
          task.title = `Update eslintrc.js`;

          const absoluteConfigPath = resolve(relativeConfigPath);

          await extendsRehearsalInCurrentConfig(
            absoluteConfigPath,
            REHEARSAL_CONFIG_RELATIVE_PATH,
            options.basePath
          );
        } else {
          task.output = `Create .eslintrc.js, extending Rehearsal default typescript-related config`;
          await extendsRehearsalInNewConfig(options.basePath, REHEARSAL_CONFIG_RELATIVE_PATH);
        }
      }
    },
  };
}

async function createRehearsalConfig(basePath: string): Promise<void> {
  const rehearsalConfigStr = 'module.exports = ' + JSON.stringify(defaultConfig, null, 2);
  const rehearsalConfigPath = resolve(basePath, REHEARSAL_CONFIG_FILENAME);
  outputFileSync(rehearsalConfigPath, rehearsalConfigStr);
  await gitAddIfInRepo(rehearsalConfigPath, basePath); // stage '.rehearsal-eslintrc.js'; if in a git repo
}

async function extendsRehearsalInCurrentConfig(
  configPath: string,
  rehearsalConfigRelativePath: string,
  basePath: string = process.cwd()
): Promise<void> {
  const projectName = determineProjectName(basePath);
  const explorerSync = cosmiconfigSync(projectName || '');
  const loaded = explorerSync.load(configPath);
  const oldConfig = loaded?.config;

  let newConfig;
  if (oldConfig) {
    newConfig = {
      ...oldConfig,
      extends: Array.from(new Set([...(oldConfig.extends || []), rehearsalConfigRelativePath])),
    };
  } else {
    newConfig = `
    module.exports = {
      extends: ['${rehearsalConfigRelativePath}']
    }
    `;
  }

  const configStr = `
  module.exports = ${JSON.stringify(newConfig, null, 2)}
  `;
  await writeLintConfig(configPath, configStr, basePath);
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
  await writeLintConfig(configPath, configStr, basePath);
}

async function writeLintConfig(
  configPath: string,
  config: string,
  basePath: string = process.cwd()
): Promise<void> {
  outputFileSync(configPath, config);
  const formattedConfig = await formatLintConfig(config, configPath);
  outputFileSync(configPath, formattedConfig);
  await gitAddIfInRepo(configPath, basePath); // stage .eslintrc.js if in a git repo
}

async function formatLintConfig(configStr: string, filePath: string): Promise<string | undefined> {
  const eslint = new ESLint({ fix: true, useEslintrc: true });
  const [report] = await eslint.lintText(configStr, { filePath: filePath });
  return report.output;
}
