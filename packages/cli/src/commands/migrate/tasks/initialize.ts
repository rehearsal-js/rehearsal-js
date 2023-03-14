import { ListrTask } from 'listr2';
import debug from 'debug';

import { determineProjectName, validateUserConfig } from '@rehearsal/utils';
import { UserConfig } from '../../../user-config.js';
import type { MigrateCommandContext, MigrateCommandOptions } from '../../../types.js';

const DEBUG_CALLBACK = debug('rehearsal:migrate:initialize');

export function initTask(
  options: MigrateCommandOptions,
  context?: Partial<MigrateCommandContext>
): ListrTask {
  return {
    title: `Initialize`,
    task: (ctx: MigrateCommandContext, task): void => {
      // If context is provide via external parameter, merge with existed
      if (context) {
        ctx = { ...ctx, ...context };
      }
      // get custom config
      const userConfig =
        options.userConfig && validateUserConfig(options.basePath, options.userConfig)
          ? new UserConfig(options.basePath, options.userConfig, 'migrate')
          : undefined;

      ctx.userConfig = userConfig;

      const projectName = determineProjectName(options.basePath);
      DEBUG_CALLBACK('projectName', projectName);

      task.output = `Setting up config for ${projectName || 'project'}`;
    },
    options: {
      // options for dryRun, since we need to keep the output to see the list of files
      bottomBar: options.dryRun ? true : false,
      persistentOutput: options.dryRun ? true : false,
    },
  };
}
