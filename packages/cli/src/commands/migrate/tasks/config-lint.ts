import { resolve, extname } from 'node:path';
import { ESLint } from 'eslint';
import { outputFileSync } from 'fs-extra/esm';
import { cosmiconfigSync } from 'cosmiconfig';
import { determineProjectName, getEsLintConfigPath } from '@rehearsal/utils';
import { stringify as yamlStringify } from 'yaml';
import { eslintDefault } from '../../../configs/eslint-default.js';
import type { ListrTask } from 'listr2';
import type { MigrateCommandContext, MigrateCommandOptions } from '../../../types.js';

enum REHEARSAL_CONFIG_FILENAMES {
  JS = '.rehearsal-eslintrc.js',
  YML = '.rehearsal-eslintrc.yml',
  YAML = '.rehearsal-eslintrc.yaml',
  JSON = '.rehearsal-eslintrc.json',
  CJS = '.rehearsal-eslintrc.cjs',
  NO_EXTENSION = '.rehearsal-eslintrc',
}

enum FORMAT {
  JS = 'js',
  JSON = 'json',
  YAML = 'yaml',
  YML = 'yml',
  CJS = 'cjs',
  NO_EXTENSION = '',
}

const DEFAULT_ESLINT_CONFIG = eslintDefault;

// check if we need to run lintConfigTask
export function shouldRunLintConfigTask(
  options: MigrateCommandOptions,
  context: Partial<MigrateCommandContext> = {}
): boolean {
  const { basePath } = options;
  const relativeConfigPath = getEsLintConfigPath(basePath);

  if (context.userConfig?.hasTsSetup) {
    // customized lint setup command/scripts from user config is nearly impossible to validate or predict
    // since we couldn't know anything about how they deal lint config
    // for now we would not run lintConfigTask if:
    // 1. has lint setup command in user config
    // 2. has lint config file .eslintrc.{js,yml,json,yaml}
    return !relativeConfigPath;
  } else {
    // should run lintConfigTask if .eslintrc doesn't exist
    // or dose not extend .rehearsal-eslintrc
    if (relativeConfigPath) {
      const projectName = determineProjectName(basePath);
      const explorerSync = cosmiconfigSync(projectName || '');
      const loaded = explorerSync.load(relativeConfigPath);
      const oldConfig = loaded?.config;
      return (
        // check if .eslintrc exists
        // or its extends has ".rehearsal-eslintrc"
        !oldConfig ||
        oldConfig.extends.filter((s: string) => s.includes(REHEARSAL_CONFIG_FILENAMES.NO_EXTENSION))
          .length === 0
      );
    } else {
      return true;
    }
  }
}

export async function lintConfigTask(
  options: MigrateCommandOptions,
  context?: Partial<MigrateCommandContext>
): Promise<ListrTask> {
  return {
    title: 'Create eslint config',
    skip: (ctx: MigrateCommandContext): boolean => !shouldRunLintConfigTask(options, ctx),
    task: async (ctx: MigrateCommandContext, task): Promise<void> => {
      // If context is provide via external parameter, merge with existed
      if (context) {
        ctx = { ...ctx, ...context };
      }

      if (ctx.userConfig?.hasLintSetup) {
        task.output = `Create .eslintrc.js from config`;
        await ctx.userConfig.lintSetup();

        if (ctx.userConfig.hasPostLintSetup) {
          task.output = `Run postLintSetup from config`;
          await ctx.userConfig.postLintSetup();
        }
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
    options: { persistentOutput: true, bottomBar: Infinity },
  };
}

async function createRehearsalConfig(basePath: string, format: FORMAT): Promise<void> {
  const filename = getRehearsalFilename(format);

  const rehearsalConfigStr = getRehearsalConfigStr(format);
  const rehearsalConfigPath = resolve(basePath, filename);

  outputFileSync(rehearsalConfigPath, rehearsalConfigStr);
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
  if (format === FORMAT.JS || format === FORMAT.CJS) {
    const formattedConfig = await lintJSConfig(config, configPath, basePath);
    formattedConfig && outputFileSync(configPath, formattedConfig);
  }
}

async function lintJSConfig(
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
    case FORMAT.CJS:
      return REHEARSAL_CONFIG_FILENAMES.CJS;
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
    case FORMAT.CJS:
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
    case FORMAT.CJS:
      str = `module.exports = ${JSON.stringify(DEFAULT_ESLINT_CONFIG, null, 2)}`;
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
