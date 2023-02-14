import { resolve, extname } from 'path';
import { ESLint } from 'eslint';
import { outputFileSync, readJSONSync } from 'fs-extra';
import { cosmiconfigSync } from 'cosmiconfig';
import { determineProjectName, getEsLintConfigPath, gitAddIfInRepo } from '@rehearsal/utils';
import { stringify as yamlStringify } from 'yaml';
import type { ListrTask } from 'listr2';
import type { MigrateCommandContext, MigrateCommandOptions } from '../../../types';

enum REHEARSAL_CONFIG_FILENAMES {
  JS = '.rehearsal-eslintrc.js',
  YML = '.rehearsal-eslintrc.yml',
  YAML = '.rehearsal-eslintrc.yaml',
  JSON = '.rehearsal-eslintrc.json',
  NO_EXTENSION = '.rehearsal-eslintrc',
}

enum FORMAT {
  JS = 'js',
  JSON = 'json',
  YAML = 'yaml',
  YML = 'yml',
  NO_EXTENSION = '',
}

const DEFAULT_ESLINT_CONFIG = readJSONSync(resolve('../../../configs/eslint-default.json'));

export async function lintConfigTask(
  options: MigrateCommandOptions,
  context?: Partial<MigrateCommandContext>
): Promise<ListrTask> {
  return {
    title: 'Create eslint config',
    enabled: (ctx: MigrateCommandContext): boolean => !ctx.skipLintConfig,
    task: async (ctx: MigrateCommandContext, task): Promise<void> => {
      // If context is provide via external parameter, merge with existed
      if (context) {
        ctx = { ...ctx, ...context };
      }

      if (ctx.userConfig?.hasLintSetup) {
        task.output = `Create .eslintrc.js from config`;
        await ctx.userConfig.lintSetup();
      } else {
        // only run the default process with no custom config provided
        const relativeConfigPath = getEsLintConfigPath(options.basePath);
        const format = getFormat(relativeConfigPath);
        const rehearsalConfigPath = getRehearsalFilename(format);

        // create .rehearsal-eslintrc.js
        await createRehearsalConfig(options.basePath, format);

        if (relativeConfigPath) {
          task.output = `${relativeConfigPath} already exists, extending Rehearsal default eslint-related config`;
          task.title = `Update .eslintrc${format === FORMAT.NO_EXTENSION ? '' : '.' + format}`;

          const absoluteConfigPath = resolve(relativeConfigPath);

          await extendsRehearsalInCurrentConfig(
            absoluteConfigPath,
            rehearsalConfigPath,
            format,
            options.basePath
          );
        } else {
          task.output = `Create .eslintrc.${FORMAT.JS}, extending Rehearsal default eslint-related config`;
          await extendsRehearsalInNewConfig(options.basePath, `.eslintrc.${FORMAT.JS}`);
        }
      }
    },
  };
}

async function createRehearsalConfig(basePath: string, format: FORMAT): Promise<void> {
  const filename = getRehearsalFilename(format);

  const rehearsalConfigStr = getRehearsalConfigStr(format);
  const rehearsalConfigPath = resolve(basePath, filename);

  outputFileSync(rehearsalConfigPath, rehearsalConfigStr);
  await gitAddIfInRepo(rehearsalConfigPath, basePath); // stage '.rehearsal-eslintrc.js'; if in a git repo
}

async function extendsRehearsalInCurrentConfig(
  configPath: string,
  rehearsalConfigRelativePath: string,
  format: FORMAT,
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
      extends: Array.from(
        new Set([...(oldConfig.extends || []), `./${rehearsalConfigRelativePath}`])
      ),
    };
    const configStr = formatConfig(newConfig, format);
    await writeLintConfig(configPath, configStr, basePath, format);
  } else {
    extendsRehearsalInNewConfig(basePath, `.eslintrc.${FORMAT.JS}`);
  }
}

async function extendsRehearsalInNewConfig(
  basePath: string,
  configRelativePath: string
): Promise<void> {
  const configPath = resolve(basePath, configRelativePath);
  const configStr = `
  module.exports = {
    extends: ['./${REHEARSAL_CONFIG_FILENAMES.JS}']
  }
  `;
  await writeLintConfig(configPath, configStr, basePath, FORMAT.JS);
}

async function writeLintConfig(
  configPath: string,
  config: string,
  basePath: string = process.cwd(),
  format: FORMAT
): Promise<void> {
  outputFileSync(configPath, config);

  //yml and ymal don't need formatting. yamlStringify does the formatting already.
  if (format === FORMAT.JS || format === FORMAT.JSON) {
    const formattedConfig = await lintConfig(config, configPath, basePath);
    formattedConfig && outputFileSync(configPath, formattedConfig);
  }
  await gitAddIfInRepo(configPath, basePath); // stage .eslintrc.js if in a git repo
}

async function lintConfig(
  configStr: string,
  filePath: string,
  basePath: string
): Promise<string | undefined> {
  const eslint = new ESLint({ fix: true, useEslintrc: true, cwd: basePath });
  const [report] = await eslint.lintText(configStr, { filePath: filePath });
  return report.output ?? '';
}

function getRehearsalFilename(format: FORMAT): string {
  switch (format) {
    case FORMAT.JS:
      return REHEARSAL_CONFIG_FILENAMES.JS;
    case FORMAT.JSON:
      return REHEARSAL_CONFIG_FILENAMES.JSON;
    case FORMAT.YAML:
      return REHEARSAL_CONFIG_FILENAMES.YAML;
    case FORMAT.YML:
      return REHEARSAL_CONFIG_FILENAMES.YML;
    case FORMAT.NO_EXTENSION:
      return REHEARSAL_CONFIG_FILENAMES.NO_EXTENSION;
    default:
      return REHEARSAL_CONFIG_FILENAMES.JS;
  }
}

function formatConfig(configObj: { [key: string]: unknown }, extension: string): string {
  let configStr = '';
  switch (extension) {
    case FORMAT.JS:
      configStr = `
      module.exports = ${JSON.stringify(configObj, null, 2)}
      `;
      break;
    case FORMAT.JSON:
    case FORMAT.NO_EXTENSION:
      configStr = JSON.stringify(configObj, null, 2);
      break;
    case FORMAT.YAML:
    case FORMAT.YML:
      configStr = yamlStringify(configObj);
      break;
    default:
  }
  return configStr;
}

function getFormat(configPath: string | undefined): FORMAT {
  if (!configPath) {
    return FORMAT.JS;
  }
  const extension = extname(configPath).replace(/\./, '');
  return extension as FORMAT;
}

function getRehearsalConfigStr(format: FORMAT): string {
  let str = '';
  switch (format) {
    case FORMAT.YAML:
    case FORMAT.YML:
      str = getYAMLConfigStr();
      break;
    case FORMAT.NO_EXTENSION:
    case FORMAT.JSON:
      str = getJsonConfigStr();
      break;
    case FORMAT.JS:
      str = `module.exports = ${DEFAULT_ESLINT_CONFIG}`;
      break;
    default:
  }
  return str;
}

//TODO: find a better way to import json file
function getJsonConfigStr(): string {
  return `
  {
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
      "sourceType": "module"
    },
    "plugins": ["@typescript-eslint", "prettier"],
    "extends": [
      "plugin:@typescript-eslint/eslint-recommended",
      "plugin:@typescript-eslint/recommended",
      "eslint:recommended",
      "plugin:prettier/recommended",
      "prettier"
    ]
  }
  `;
}

//TODO: find a better way to import yaml file
function getYAMLConfigStr(): string {
  return `
  parser: '@typescript-eslint/parser'
  parserOptions:
    sourceType: module
  plugins:
    - '@typescript-eslint'
    - prettier
  extends:
    - 'plugin:@typescript-eslint/eslint-recommended'
    - 'plugin:@typescript-eslint/recommended'
    - 'eslint:recommended'
    - 'plugin:prettier/recommended'
    - prettier
  `;
}
