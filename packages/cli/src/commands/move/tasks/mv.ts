import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ListrTask } from 'listr2';
import debug from 'debug';

import type { CommandContext, MoveCommandOptions } from '../../../types.js';
import type { ListrTaskWrapper, ListrDefaultRenderer } from 'listr2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workerPath = resolve(__dirname, 'mvWorker.js');
const DEBUG_CALLBACK = debug('rehearsal:cli:moveTask');

type MoveCommandTask = ListrTaskWrapper<CommandContext, ListrDefaultRenderer>;

// rename files to TS extension via git mv only. will throw if the file has not been tracked
export function moveTask(
  src: string,
  options: MoveCommandOptions,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ctx?: CommandContext
): ListrTask<CommandContext, ListrDefaultRenderer> {
  return {
    title: 'Executing git mv',
    task: async (ctx: CommandContext, task: MoveCommandTask): Promise<void> => {
      const { dryRun } = options;
      const { sourceFilesAbs } = ctx;

      DEBUG_CALLBACK(`sourceFilesAbs: ${sourceFilesAbs}`);

      if (dryRun) {
        task.title = 'Executing git mv (dry run)';
      }

      if (sourceFilesAbs) {
        if (process.env['TEST'] === 'true' || process.env['WORKER'] === 'false') {
          // Do this on the main thread because there are issues with resolving worker scripts for worker_threads in vitest
          const { gitMove } = await import('./mvWorker.js').then((m) => m);
          task.output = gitMove(sourceFilesAbs, src, dryRun);
        } else {
          await new Promise<string>((resolve, reject) => {
            task.title = 'Executing git mv ...';

            // Run git mv in a worker thread so the ui thread doesn't hang
            const worker = new Worker(workerPath, {
              workerData: JSON.stringify({
                sourceFiles: sourceFilesAbs,
                basePath: src,
                dryRun,
              }),
            });

            worker.on('message', (output: string) => {
              task.output = output;
              resolve(output);
            });

            worker.on('error', reject);
            worker.on('exit', (code) => {
              if (code !== 0) {
                reject(new Error(`Worker stopped with exit code ${code}`));
              }
            });
          });
        }
      } else {
        task.skip('JS files not detected');
      }
    },
    options: { persistentOutput: true },
  };
}
