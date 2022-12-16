import { ListrTask } from 'listr2';

import { MigrateCommandContext, MigrateCommandOptions } from '../../../types';
import { addPackageJsonScripts } from '../../../utils';

export function createScriptsTask(options: MigrateCommandOptions): ListrTask {
  return {
    title: 'Creating new scripts for Typescript in package.json',
    enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
    task: async () => {
      addPackageJsonScripts(options.basePath, {
        'build:tsc': 'tsc -b',
        'lint:tsc': 'tsc --noEmit',
      });
    },
  };
}
