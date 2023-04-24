import { ListrTask, ListrTask } from 'listr2';
import debug from 'debug';

import { determineProjectName, validateUserConfig, getEsLintConfigPath } from '@rehearsal/utils';
import { UserConfig } from '../../../user-config.js';
import type {
  MigrateCommandContext,
  MigrateCommandOptions,
  MigrateCommandOptions,
} from '../../../types.js';

const DEBUG_CALLBACK = debug('rehearsal:migrate:initialize');

export function initTask(
  options: MigrateCommandOptions,
  context?: Partial<MigrateCommandContext>
): ListrTask {
  return {
    title: `Initialize`,
    task: (ctx: MigrateCommandContext, task): void => {
      // If context is provide via external parameter, merge with existed
      if (context) {
        ctx = { ...ctx, ...context };
      }
      // get custom config
      const userConfig =
        options.userConfig && validateUserConfig(options.basePath, options.userConfig)
          ? new UserConfig(options.basePath, options.userConfig, 'migrate')
          : undefined;

      ctx.userConfig = userConfig;

      const projectName = determineProjectName(options.basePath);
      DEBUG_CALLBACK('projectName', projectName);

      task.output = `Setting up config for ${projectName || 'project'}`;
    },
    options: {
      // options for dryRun, since we need to keep the output to see the list of files
      bottomBar: options.dryRun ? true : false,
      persistentOutput: options.dryRun ? true : false,
    },
  };
}

import { resolve } from 'node:path';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { Logger } from 'winston';

function checkLintConfig(basePath: string, logger: Logger): boolean {
  const lintConfigPath = getEsLintConfigPath(basePath);
  if (!lintConfigPath) {
    logger.warn(
      `Eslint config (.eslintrc.{js,yml,json,yaml}) does not exist. You need to run rehearsal migrate first before you can run rehearsal migrate --regen`
    );
    return false;
  }
  return true;
}

function checkTsConfig(basePath: string, logger: Logger): boolean {
  const tsConfigPath = resolve(basePath, 'tsconfig.json');
  if (!existsSync(tsConfigPath)) {
    logger.warn(
      `${tsConfigPath} does not exist. You need to run rehearsal migrate first before you can run rehearsal migrate --regen`
    );
    return false;
  }
  return true;
}

function checkPackageJson(basePath: string): boolean {
  const packageJsonPath = resolve(basePath, 'package.json');
  if (!existsSync(packageJsonPath)) {
    throw new Error(
      `${packageJsonPath} does not exists. Please run rehearsal migrate inside a project with a valid package.json.`
    );
  }
  return true;
}

function checkGitIgnore(basePath: string): boolean {
  const gitignorePath = resolve(basePath, '.gitignore');
  if (!existsSync(gitignorePath)) {
    return true;
  }

  const gitignore = readFileSync(gitignorePath, 'utf-8');
  const rehearsalRegex = /\.rehearsal.*/g;
  if (rehearsalRegex.test(gitignore)) {
    throw new Error(
      `.rehearsal directory is ignored by .gitignore file. Please remove it from .gitignore file and try again.`
    );
  }
  return true;
}

export function reportExisted(basePath: string, outputPath?: string): boolean {
  const reportRegex = /migrate-report\.(json|md|sarif|sonarqube)/g;
  const reportDir = outputPath ? resolve(basePath, outputPath) : resolve(basePath, '.rehearsal');
  return (
    existsSync(reportDir) &&
    readdirSync(reportDir).filter((d: string) => reportRegex.test(d)).length > 0
  );
}

export function validateTask(options: MigrateCommandOptions, logger: Logger): ListrTask {
  return {
    title: 'Validate project',
    enabled: (): boolean => !options.dryRun,
    task: (): void => {
      checkPackageJson(options.basePath);
      checkGitIgnore(options.basePath);

      if (options.regen) {
        checkLintConfig(options.basePath, logger);
        checkTsConfig(options.basePath, logger);
      }
    },
  };
}
