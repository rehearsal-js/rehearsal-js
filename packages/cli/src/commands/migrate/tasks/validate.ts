import { resolve } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { Listr, ListrTask } from 'listr2';
import { Logger } from 'winston';
import { getEsLintConfigPath } from '@rehearsal/utils';
import { validateGitIgnore } from './subtasks/validateGitIgnore.js';
import { validateUncommittedFiles } from './subtasks/validateUncommittedFiles.js';
import type { MigrateCommandContext } from '../../../types.js';

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

export function reportExisted(basePath: string, outputPath?: string): boolean {
  const reportRegex = /migrate-report\.(json|md|sarif|sonarqube)/g;
  const reportDir = outputPath ? resolve(basePath, outputPath) : resolve(basePath, '.rehearsal');
  return (
    existsSync(reportDir) &&
    readdirSync(reportDir).filter((d: string) => reportRegex.test(d)).length > 0
  );
}

/**
 * Checks if there is any upcommitted
 * @param dryRun
 */

export type ValidateTaskOptions = {
  basePath: string;
  outputPath: string;
  dryRun: boolean;
  validateTypescriptConfig?: boolean;
  validateLintConfig?: boolean;
};

export async function validateTask(
  options: ValidateTaskOptions,
  logger: Logger
): Promise<ListrTask> {
  return {
    title: 'Validate',
    enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
    task: async (_, task): Promise<Listr> => {
      task.output = 'I will push an output. [0]';
      return task.newListr(
        [
          {
            title: 'uncommitted files',
            task: validateUncommittedFiles,
          },
          {
            title: 'package.json',
            task: async (_, task): Promise<void> => {
              task.output = 'packagepackage';
              checkPackageJson(options.basePath);
            },
          },
          {
            title: '.gitignore',
            task: validateGitIgnore,
          },
          {
            title: 'Eslint config',
            enabled: options.validateLintConfig,
            task: async (_, task): Promise<void> => {
              task.output = 'asdsda';
              checkLintConfig(options.basePath, logger);
            },
          },
          {
            title: 'tsconfig config',
            enabled: false,
            task: async (_, task): Promise<void> => {
              task.output = 'asdsda';
              checkTsConfig(options.basePath, logger);
            },
          },
        ],
        {
          exitOnError: true,
          rendererOptions: {
            collapse: false,
            collapseErrors: false,
            collapseSkips: true,
            showSkipMessage: false,
          },
        }
      );
    },
  };
}
