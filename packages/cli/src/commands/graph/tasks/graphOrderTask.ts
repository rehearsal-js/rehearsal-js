import { dirname, resolve } from 'node:path';
import { Worker } from 'node:worker_threads';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ListrTask } from 'listr2';
import type { PackageEntry } from './graphWorker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const workerPath = resolve(__dirname, 'graphWorker.js');

export function graphOrderTask(basePath: string, outputPath?: string): ListrTask {
  return {
    title: 'Analyzing project dependency graph',
    options: { persistentOutput: true },
    async task(_ctx, task) {
      const order = (await new Promise((resolve, reject) => {
        task.title = 'Analyzing project dependency graph ...';
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
      })) as { packages: PackageEntry[] };

      if (outputPath) {
        task.title = `Writing graph to ${outputPath} ...`;
        await writeFile(outputPath, JSON.stringify(order, null, 2));
      } else {
        const selectedPackageName = (await task.prompt([
          {
            type: 'Select',
            name: 'packageSelection',
            message:
              'We found the following packages. Select a packages to see the order of files:',
            choices: order.packages.map((p) => p.name),
          },
        ])) as string;

        const entry = order.packages
          .find((pkg) => pkg.name === selectedPackageName)
          ?.files.join('\n');

        task.output = `Graph order for '${selectedPackageName}':\n\n${entry}`;
      }
    },
  };
}
