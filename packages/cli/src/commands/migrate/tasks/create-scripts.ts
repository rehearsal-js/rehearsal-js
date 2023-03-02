import { ListrTask } from 'listr2';

import { addPackageJsonScripts } from '@rehearsal/utils';
import type { MigrateCommandContext, MigrateCommandOptions } from '../../../types.js';

export async function createScriptsTask(options: MigrateCommandOptions): Promise<ListrTask> {
  return {
    title: 'Add package scripts',
    enabled: (ctx: MigrateCommandContext): boolean => !ctx.skipScriptConfig,
    task: async (): Promise<void> => {
      addPackageJsonScripts(options.basePath, {
        'lint:tsc': 'tsc --noEmit',
      });
    },
  };
}
