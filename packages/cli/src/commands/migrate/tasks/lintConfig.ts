import { ListrTask } from 'listr2';

import { MigrateCommandContext } from '../../../types';

export function lintConfigTask(): ListrTask {
  return {
    title: 'Creating eslint config',
    enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
    task: async (_ctx: MigrateCommandContext, task) => {
      if (_ctx.userConfig?.hasLintSetup) {
        task.title = `Creating .eslintrc.js from custom config`;
        await _ctx.userConfig.lintSetup();
      } else {
        task.skip(`Skip creating .eslintrc.js since no custom config is provided.`);
      }
    },
  };
}
