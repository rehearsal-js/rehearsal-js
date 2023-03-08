import { resolve } from 'node:path';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { ListrTask } from 'listr2';
import { Logger } from 'winston';
import { getEsLintConfigPath } from '@rehearsal/utils';
import type { MigrateCommandContext, MigrateCommandOptions } from '../../../types.js';

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

export async function validateTask(
  options: MigrateCommandOptions,
  logger: Logger
): Promise<ListrTask> {
  return {
    title: 'Validate project',
    enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
    task: async (): Promise<void> => {
      checkPackageJson(options.basePath);
      checkGitIgnore(options.basePath);

      if (options.regen) {
        checkLintConfig(options.basePath, logger);
        checkTsConfig(options.basePath, logger);
      }
    },
  };
}
