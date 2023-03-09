import { ListrTask } from 'listr2';
import debug from 'debug';

import { determineProjectName, validateUserConfig } from '@rehearsal/utils';
import { UserConfig } from '../../../user-config.js';
import type { MigrateCommandContext, MigrateCommandOptions } from '../../../types.js';

const DEBUG_CALLBACK = debug('rehearsal:migrate:initialize');

export async function initTask(
  options: MigrateCommandOptions,
  context?: Partial<MigrateCommandContext>
): Promise<ListrTask> {
  return {
    title: `Initialize${options.dryRun ? ' -- Dry Run Mode' : ''}`,
    task: async (ctx: MigrateCommandContext, task): Promise<void> => {
      // If context is provide via external parameter, merge with existed
      if (context) {
        ctx = { ...ctx, ...context };
      }
      // get custom config
      const userConfig = validateUserConfig(options.basePath, 'rehearsal-config.json')
        ? new UserConfig(options.basePath, 'migrate')
        : undefined;

      ctx.userConfig = userConfig;

      const projectName = determineProjectName(options.basePath);
      DEBUG_CALLBACK('projectName', projectName);

      task.output = `Setting up config for ${projectName}`;
    },
    options: {
      // options for dryRun, since we need to keep the output to see the list of files
      bottomBar: options.dryRun ? true : false,
      persistentOutput: options.dryRun ? true : false,
    },
  };
}
