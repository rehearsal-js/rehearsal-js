import { ListrTask } from 'listr2';

import { addPackageJsonScripts } from '@rehearsal/utils';
import type { MigrateCommandContext, MigrateCommandOptions } from '../../../types';

export async function createScriptsTask(options: MigrateCommandOptions): Promise<ListrTask> {
  return {
    title: 'Add package scripts',
    enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
    task: async (): Promise<void> => {
      addPackageJsonScripts(options.basePath, {
        'build:tsc': 'tsc -b',
        'lint:tsc': 'tsc --noEmit',
      });
    },
  };
}
