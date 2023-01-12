import { ListrTask } from 'listr2';

import { addDep } from '../../../utils';
import type { MigrateCommandContext, MigrateCommandOptions } from '../../../types';

export const REQUIRED_DEPENDENCIES = [
  'typescript',
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/parser',
  'eslint-plugin-prettier',
  'prettier',
  'eslint',
  'eslint-config-prettier',
  '@types/node',
];

export async function depInstallTask(options: MigrateCommandOptions): Promise<ListrTask> {
  return {
    title: 'Install dependencies',
    enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
    task: async (ctx: MigrateCommandContext, task): Promise<void> => {
      // install custom dependencies
      if (ctx.userConfig?.hasDependencies) {
        task.output = `Install dependencies from config`;
        await ctx.userConfig.install();
      }
      // even if dependencies are installed, exec this and get the latest patch
      await addDep(REQUIRED_DEPENDENCIES, true, { cwd: options.basePath });
    },
  };
}
