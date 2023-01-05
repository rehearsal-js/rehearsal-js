import { resolve } from 'path';
import { ListrTask } from 'listr2';
import { existsSync, writeJSONSync } from 'fs-extra';

import { readJSON, writeTSConfig } from '../../../utils';

import type { MigrateCommandContext, MigrateCommandOptions, TSConfig } from '../../../types';

export async function tsConfigTask(options: MigrateCommandOptions): Promise<ListrTask> {
  return {
    title: 'Create tsconfig.json',
    enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
    task: async (ctx: MigrateCommandContext, task): Promise<void> => {
      if (ctx.userConfig?.hasTsSetup) {
        task.output = `Create tsconfig from config`;
        await ctx.userConfig.tsSetup();
      } else {
        const configPath = resolve(options.basePath, 'tsconfig.json');

        if (existsSync(configPath)) {
          task.output = `${configPath} already exists, ensuring strict mode is enabled`;
          task.title = `Update tsconfig.json`;

          const tsConfig = readJSON<TSConfig>(configPath) as TSConfig;
          tsConfig.compilerOptions.strict = true;
          writeJSONSync(configPath, tsConfig, { spaces: 2 });
        } else {
          writeTSConfig(options.basePath, ctx.sourceFilesWithRelativePath);
        }
      }
    },
  };
}
