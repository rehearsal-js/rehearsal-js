import { ListrTask, ListrDefaultRenderer } from 'listr2';
import debug from 'debug';
import { validateSourcePath, validatePackagePath } from '@rehearsal/utils';
import type { CommandContext, MoveCommandOptions } from '../../../types.js';

const DEBUG_CALLBACK = debug('rehearsal:cli:move:init-task');

// everything is relative to the project root. options.basePath cannot be configured by the user
export function initTask(
  src: string,
  options: MoveCommandOptions
): ListrTask<CommandContext, ListrDefaultRenderer> {
  return {
    title: `Validating source path`,
    task: (ctx: CommandContext): void => {
      const { rootPath, graph, ignore } = options;

      if (graph) {
        validatePackagePath(rootPath, src);
      } else {
        [ctx.sourceFilesAbs, ctx.sourceFilesRel] = validateSourcePath(rootPath, src, 'js', ignore);
      }

      DEBUG_CALLBACK('init ctx %O:', ctx);
    },
  };
}
