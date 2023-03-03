import { ListrTask } from 'listr2';

import { addPackageJsonScripts } from '@rehearsal/utils';
import type { MigrateCommandOptions } from '../../../types.js';

export async function createScriptsTask(options: MigrateCommandOptions): Promise<ListrTask> {
  return {
    title: 'Add package scripts',
    task: async (_, task): Promise<void> => {
      task.output = `Adding "lint:tsc" script in package.json`;
      addPackageJsonScripts(options.basePath, {
        'lint:tsc': 'tsc --noEmit',
      });
    },
  };
}
