import { ListrTask } from 'listr2';

import { MigrateCommandContext, MigrateCommandOptions } from '../../../types';
import { addDep } from '../../../utils';

export function depInstallTask(options: MigrateCommandOptions): ListrTask {
  return {
    title: 'Installing dependencies',
    enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
    task: async (ctx: MigrateCommandContext, task) => {
      // install custom dependencies
      if (ctx.userConfig?.hasDependencies) {
        task.title = `Installing custom dependencies`;
        await ctx.userConfig.install();
      }
      // even if typescript is installed, exec this and get the latest patch
      await addDep(['typescript'], true, { cwd: options.basePath });
    },
  };
}
