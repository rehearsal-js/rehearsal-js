import { ListrTask } from 'listr2';

import { addPackageJsonScripts } from '@rehearsal/utils';
import type { MigrateCommandOptions } from '../../../types.js';

export function createScriptsTask(options: MigrateCommandOptions): ListrTask {
  return {
    title: 'Add package scripts',
    enabled: (): boolean => !options.dryRun,
    task: (_, task): void => {
      task.output = `Adding "lint:tsc" script in package.json`;
      addPackageJsonScripts(options.basePath, {
        'lint:tsc': 'tsc --noEmit',
      });
    },
  };
}
