import { dirname, resolve } from 'node:path';
import { Worker } from 'node:worker_threads';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ListrDefaultRenderer, ListrTask } from 'listr2';
import type { PackageEntry } from './graphWorker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const workerPath = resolve(__dirname, 'graphWorker.js');

export type GraphCommandContext = {
  skip?: boolean;
};

export function graphOrderTask(
  basePath: string,
  outputPath?: string
): ListrTask<GraphCommandContext, ListrDefaultRenderer> {
  return {
    title: 'Analyzing project dependency graph',
    options: { persistentOutput: true },
    async task(_ctx: GraphCommandContext, task) {
      let order: { packages: PackageEntry[] };
      if (process.env['TEST'] === 'true') {
        // Do this on the main thread because there are issues with resolving worker scripts for worker_threads in vitest
        const { intoGraphOutput } = await import('./graphWorker.js').then((m) => m);
        const { getMigrationOrder } = await import('@rehearsal/migration-graph').then((m) => m);
        order = intoGraphOutput(getMigrationOrder(basePath), basePath);
      } else {
        order = await new Promise<{ packages: PackageEntry[] }>((resolve, reject) => {
          task.title = 'Analyzing project dependency graph ...';

          // Run graph traversal in a worker thread so the ui thread doesn't hang
          const worker = new Worker(workerPath, {
            workerData: basePath,
          });

          worker.on('message', (packages: { packages: PackageEntry[] }) => {
            resolve(packages);
          });

          worker.on('error', reject);
          worker.on('exit', (code) => {
            if (code !== 0) {
              reject(new Error(`Worker stopped with exit code ${code}`));
            }
          });
        });
      }

      if (outputPath) {
        task.title = `Writing graph to ${outputPath} ...`;

        await writeFile(outputPath, JSON.stringify(order, null, 2));
      } else {
        let selectedPackageName: string;

        if (order.packages.length > 1) {
          selectedPackageName = await task.prompt<string>([
            {
              type: 'Select',
              name: 'packageSelection',
              message:
                'We found the following packages. Select a packages to see the order of files:',
              choices: order.packages.map((p) => p.name),
            },
          ]);
        } else {
          selectedPackageName = order.packages[0].name;
        }

        const entry = order.packages
          .find((pkg) => pkg.name === selectedPackageName)
          ?.files.join('\n');

        task.output = `Graph order for '${selectedPackageName}':\n\n${entry}`;
      }
    },
  };
}
