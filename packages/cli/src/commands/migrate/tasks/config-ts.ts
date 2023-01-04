import { resolve } from 'path';
import { ListrTask } from 'listr2';
import { existsSync, writeJSONSync } from 'fs-extra';

import { readJSON, writeTSConfig } from '../../../utils';

import type { MigrateCommandContext, MigrateCommandOptions, TSConfig } from '../../../types';

export function tsConfigTask(options: MigrateCommandOptions): ListrTask {
  return {
    title: 'Creating tsconfig.json',
    enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
    task: async (ctx: MigrateCommandContext, task) => {
      if (ctx.userConfig?.hasTsSetup) {
        task.title = `Creating tsconfig from custom config`;
        await ctx.userConfig.tsSetup();
      } else {
        const configPath = resolve(options.basePath, 'tsconfig.json');

        if (existsSync(configPath)) {
          task.title = `${configPath} already exists, ensuring strict mode is enabled`;

          const tsConfig = readJSON<TSConfig>(configPath) as TSConfig;
          tsConfig.compilerOptions.strict = true;
          writeJSONSync(configPath, tsConfig, { spaces: 2 });
        } else {
          task.title = `Creating tsconfig`;

          writeTSConfig(options.basePath, ctx.sourceFilesWithRelativePath);
        }
      }
    },
  };
}
