import type { ListrTask } from 'listr2';
import type { MigrateCommandContext } from '../../../types';

export async function lintConfigTask(): Promise<ListrTask> {
  return {
    title: 'Create eslint config',
    enabled: (ctx: MigrateCommandContext): boolean => !ctx.skip,
    task: async (_ctx: MigrateCommandContext, task): Promise<void> => {
      if (_ctx.userConfig?.hasLintSetup) {
        task.output = `Create .eslintrc.js from config`;
        await _ctx.userConfig.lintSetup();
      } else {
        task.skip(`Skip creating .eslintrc.js since no custom config is provided`);
      }
    },
  };
}
