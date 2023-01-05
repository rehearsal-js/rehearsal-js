import { ListrTask } from 'listr2';

import { addDep } from '../../../utils';
import type { MigrateCommandContext, MigrateCommandOptions } from '../../../types';

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
      // even if typescript is installed, exec this and get the latest patch
      await addDep(['typescript'], true, { cwd: options.basePath });
    },
  };
}
