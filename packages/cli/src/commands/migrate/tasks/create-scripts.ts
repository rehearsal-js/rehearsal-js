import { ListrTask } from 'listr2';

import { addPackageJsonScripts } from '@rehearsal/utils';
import type { MigrateCommandContext } from '../../../types';

export async function createScriptsTask(basePath: string): Promise<ListrTask> {
  return {
    title: 'Add package scripts',
    enabled: (ctx: MigrateCommandContext): boolean => !ctx.skipScriptConfig,
    task: async (): Promise<void> => {
      addPackageJsonScripts(basePath, {
        'lint:tsc': 'tsc --noEmit',
      });
    },
  };
}
