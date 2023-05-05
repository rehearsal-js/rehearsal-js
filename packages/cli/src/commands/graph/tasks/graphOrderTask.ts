import { dirname, resolve } from 'node:path';
import { Worker } from 'node:worker_threads';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import debug from 'debug';
import { ListrDefaultRenderer, ListrTask } from 'listr2';
import type { PackageEntry, GraphCommandContext, GraphTaskOptions } from '../../../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const workerPath = resolve(__dirname, 'graphWorker.js');

const DEBUG_CALLBACK = debug('rehearsal:cli:graphOrderTask');

export function graphOrderTask(
  srcDir: string,
  options: GraphTaskOptions,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ctx?: GraphCommandContext
): ListrTask<GraphCommandContext, ListrDefaultRenderer> {
  return {
    title: 'Analyzing project dependency graph',
    options: { persistentOutput: true },
    async task(ctx: GraphCommandContext, task) {
      let order: { packages: PackageEntry[] };
      const { output, rootPath } = options;
      let selectedPackageName: string;

      if (process.env['TEST'] === 'true') {
        // Do this on the main thread because there are issues with resolving worker scripts for worker_threads in vitest
        const { intoGraphOutput } = await import('./graphWorker.js').then((m) => m);
        const { getMigrationOrder } = await import('@rehearsal/migration-graph').then((m) => m);

        order = intoGraphOutput(
          getMigrationOrder(srcDir, {
            basePath: rootPath,
            crawlDevDeps: options.devDeps,
            crawlDeps: options.deps,
            ignoredGlobs: options.ignore,
            include: [],
            exclude: [],
          }),
          rootPath
        );
      } else {
        order = await new Promise<{ packages: PackageEntry[] }>((resolve, reject) => {
          task.title = 'Analyzing project dependency graph ...';

          // Run graph traversal in a worker thread so the ui thread doesn't hang
          const worker = new Worker(workerPath, {
            workerData: JSON.stringify({
              srcDir,
              basePath: rootPath,
              crawlDevDeps: options.devDeps,
              crawlDeps: options.deps,
              ignoredPackages: options.ignore,
              include: [],
              exclude: [],
            }),
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

      DEBUG_CALLBACK(`order: ${JSON.stringify(order, null, 2)}`);
      DEBUG_CALLBACK(`ctx: ${JSON.stringify(ctx, null, 2)}`);

      // if explicit package is passed in use that
      if (ctx?.package) {
        ctx.jsSourcesAbs = order.packages.flatMap((pkg) => pkg.files);

        return;
      }

      // dont prompt just write the file
      if (output) {
        task.title = `Writing graph to ${output} ...`;

        await writeFile(output, JSON.stringify(order, null, 2));
      } else {
        // if more than 1 package found prompt the user to select one
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

        const entry = getPackageEntry(order, selectedPackageName);

        task.output = `Graph order for '${selectedPackageName}':\n\n${entry}`;
      }
    },
  };
}

function getPackageEntry(
  order: { packages: PackageEntry[] },
  selectedPackageName: string
): string | undefined {
  return order.packages.find((pkg) => pkg.name === selectedPackageName)?.files.join('\n');
}
