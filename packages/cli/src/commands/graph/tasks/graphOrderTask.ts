import { dirname, join, resolve } from 'node:path';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { ListrDefaultRenderer, ListrTask } from 'listr2';
import { discoverServiceDependencies, Resolver, topSortFiles } from '@rehearsal/migration-graph';
import { readJSON } from '@rehearsal/utils';
import debug from 'debug';
import { getFiles, writeOutput } from './graphWorker.js';
import { Response } from './types.js';
import type { CommandContext, GraphTaskOptions } from '../../../types.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const workerPath = resolve(__dirname, 'graphWorker.js');

const DEBUG_CALLBACK = debug('rehearsal:cli:graph');

export function graphOrderTask(
  srcPath: string,
  options: GraphTaskOptions,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ctx?: CommandContext
): ListrTask<CommandContext, ListrDefaultRenderer> {
  return {
    title: 'Analyzing project dependency graph',
    options: { persistentOutput: true },
    async task(ctx: CommandContext, task) {
      let orderedFiles: string[] = [];
      const { output, rootPath, ignore, skipPrompt } = options;

      const serviceMapPath = join(rootPath, '.rehearsal', 'services-map.json');
      let serviceMap: Record<string, string> = {};

      if (existsSync(serviceMapPath)) {
        serviceMap = (await readJSON(join(rootPath, '.rehearsal', 'services-map.json'))) || {};
      }

      if (process.env['TEST'] === 'true' || process.env['WORKER'] === 'false') {
        // Do this on the main thread because there are issues with resolving worker scripts for worker_threads in vitest
        const servicesResolver = discoverServiceDependencies(serviceMap);
        const absolutePath = resolve(rootPath, srcPath);
        const resolver = new Resolver({ customResolver: servicesResolver, ignore });

        await resolver.load();

        const files = await getFiles(absolutePath, srcPath, ignore);

        for (const file of files) {
          resolver.walk(file);
        }

        orderedFiles = topSortFiles(resolver.graph);

        if (output) {
          await writeOutput(rootPath, resolver.graph, orderedFiles, output);
        }
      } else {
        orderedFiles = await new Promise<string[]>((resolve, reject) => {
          task.title = 'Analyzing project dependency graph ...';

          // Run graph traversal in a worker thread so the ui thread doesn't hang
          const worker = new Worker(workerPath, {
            workerData: JSON.stringify({
              srcPath,
              rootPath,
              output,
              ignore: options.ignore,
              serviceMap,
            }),
          });

          worker.on('message', (response: Response) => {
            switch (response.type) {
              case 'message':
                task.title = response.content;
                break;
              case 'files':
                resolve(response.content);
                break;
            }
          });
          worker.on('error', reject);
          worker.on('exit', (code) => {
            if (code !== 0) {
              reject(new Error(`Worker stopped with exit code ${code}`));
            }
          });
        });
      }

      if (!output && !skipPrompt) {
        task.output = `Graph order for '${srcPath}':\n\n${orderedFiles
          .map((filePath) => filePath.replace(rootPath, '.'))
          .join('\n')}`;
      }

      DEBUG_CALLBACK(`graph file order: ${JSON.stringify(orderedFiles, null, 2)}`);

      ctx.orderedFiles = orderedFiles;
    },
  };
}
