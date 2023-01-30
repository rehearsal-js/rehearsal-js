import { ListrTask } from 'listr2';

import { addDep } from '@rehearsal/utils';
import type { MigrateCommandContext, MigrateCommandOptions } from '../../../types';

export const REQUIRED_DEPENDENCIES = [
  '@types/node',
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/parser',
  'eslint',
  'eslint-config-prettier',
  'eslint-plugin-prettier',
  'prettier',
  'typescript',
];

export async function depInstallTask(
  options: MigrateCommandOptions,
  context?: Partial<MigrateCommandContext>
): Promise<ListrTask> {
  return {
    title: 'Install dependencies',
    enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
    task: async (ctx: MigrateCommandContext, task): Promise<void> => {
      // If context is provide via external parameter, merge with existed
      if (context) {
        ctx = { ...ctx, ...context };
      }
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
