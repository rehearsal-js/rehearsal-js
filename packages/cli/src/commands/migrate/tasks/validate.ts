import { resolve } from 'path';
import { ListrTask } from 'listr2';
import { Logger } from 'winston';
import { existsSync } from 'fs-extra';

import { getEsLintConfigPath } from '../../../utils';
import type { MigrateCommandContext, MigrateCommandOptions } from '../../../types';

export async function validateTask(
  options: MigrateCommandOptions,
  logger: Logger
): Promise<ListrTask> {
  return {
    title: 'Validate project',
    enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
    task: async (): Promise<void> => {
      const packageJsonPath = resolve(options.basePath, 'package.json');
      if (!existsSync(packageJsonPath)) {
        throw new Error(
          `${packageJsonPath} does not exists. Please run rehearsal migrate inside a project with a valid package.json.`
        );
      }
      if (options.regen) {
        const lintConfigPath = getEsLintConfigPath(options.basePath);
        if (!lintConfigPath) {
          logger.warn(
            `Eslint config (.eslintrc.{js,yml,json,yaml}) does not exist. You need to run rehearsal migrate first before you can run rehearsal migrate --regen`
          );
        }
        const tsConfigPath = resolve(options.basePath, 'tsconfig.json');
        if (!existsSync(tsConfigPath)) {
          logger.warn(
            `${tsConfigPath} does not exist. You need to run rehearsal migrate first before you can run rehearsal migrate --regen`
          );
        }
      }
    },
  };
}
