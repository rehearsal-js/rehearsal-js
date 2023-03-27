import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { ListrTask } from 'listr2';
import { DEFAULT_TS_CONFIG, readTSConfig, writeTSConfig } from '@rehearsal/utils';
import { parseTsconfig } from 'get-tsconfig';

import type { MigrateCommandContext, MigrateCommandOptions, TSConfig } from '../../../types.js';

// check if we need to run tsConfigTask
export function shouldRunTsConfigTask(options: MigrateCommandOptions): boolean {
  // customized ts setup command/scripts from user config is nearly impossible to validate or predict
  // since we couldn't know anything about how they deal with tsconfig.json
  // for now we would not run tsConfigTask if:
  // 1. tsconfig.json exists
  // 2. it is in strict mode
  const { basePath } = options;
  const configPath = resolve(basePath, 'tsconfig.json');

  if (existsSync(configPath)) {
    // Resolve extends
    try {
      // Using parseTsConfig instead of readTsConfig because we
      // need to get the resolved values from all the extends.
      const parsedTsconfig = parseTsconfig(configPath);
      return !parsedTsconfig.compilerOptions?.strict === true;
    } catch (e) {
      // if cannot resolve the extends in tsconfig.json
      return true;
    }
  }
  return true;
}

export function tsConfigTask(
  options: MigrateCommandOptions,
  context?: Partial<MigrateCommandContext>
): ListrTask {
  return {
    title: 'Create tsconfig.json',
    enabled: (): boolean => !options.dryRun,
    skip: (): boolean => !shouldRunTsConfigTask(options),
    task: async (ctx: MigrateCommandContext, task): Promise<void> => {
      // If context is provide via external parameter, merge with existed
      if (context) {
        ctx = { ...ctx, ...context };
      }
      const configPath = resolve(options.basePath, 'tsconfig.json');

      if (ctx.userConfig?.hasTsSetup) {
        task.output = `Create tsconfig from config`;
        await ctx.userConfig.tsSetup();

        if (ctx.userConfig.hasPostTsSetupHook) {
          task.output = `Run postTsSetup from config`;
          await ctx.userConfig.postTsSetup();
        }
      } else {
        if (existsSync(configPath)) {
          task.output = `${configPath} already exists, ensuring strict mode is enabled`;
          task.title = `Update tsconfig.json`;

          const tsConfig = readTSConfig<TSConfig>(configPath);
          if (!tsConfig.compilerOptions) {
            tsConfig.compilerOptions = { strict: true };
          } else {
            tsConfig.compilerOptions.strict = true;
          }
          writeTSConfig(configPath, tsConfig);
        } else {
          writeTSConfig(configPath, DEFAULT_TS_CONFIG);
        }
      }
    },
    options: { persistentOutput: false, bottomBar: Infinity },
  };
}
