import { dirname, resolve } from 'node:path';
import { Worker } from 'node:worker_threads';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ListrDefaultRenderer, ListrTask } from 'listr2';
import type { PackageEntry, GraphCommandContext, GraphTaskOptions } from '../../../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const workerPath = resolve(__dirname, 'graphWorker.js');

export function graphOrderTask(
  options: GraphTaskOptions,
  ctx?: GraphCommandContext
): ListrTask<GraphCommandContext, ListrDefaultRenderer> {
  return {
    title: 'Analyzing project dependency graph',
    skip: (): boolean => !shouldRunGraphTask(ctx?.source),
    options: { persistentOutput: true },
    async task(ctx: GraphCommandContext, task) {
      let order: { packages: PackageEntry[] };
      const { basePath, output } = options;
      let selectedPackageName: string;

      if (process.env['TEST'] === 'true') {
        // Do this on the main thread because there are issues with resolving worker scripts for worker_threads in vitest
        const { intoGraphOutput } = await import('./graphWorker.js').then((m) => m);
        const { getMigrationOrder } = await import('@rehearsal/migration-graph').then((m) => m);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
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

      // dont prompt just set the ctx and return
      if (ctx?.childPackage) {
        selectedPackageName = ctx.childPackage;
        ctx.packageEntry = getPackageEntry(order, ctx.childPackage);
        ctx.jsSourcesAbs = getGraphFilesAbs(basePath, ctx.childPackage, order.packages);

        return;
      }

      // dont prompt just write the file
      if (output) {
        task.title = `Writing graph to ${output} ...`;

        await writeFile(output, JSON.stringify(order, null, 2));
      } else {
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

// get all the js | gjs files from the graph and return as absolute paths. the graph will filter the extensions
function getGraphFilesAbs(
  basePath: string,
  childPackage: string,
  entries: PackageEntry[]
): string[] {
  const pkg = entries.find((p) => p.name === childPackage);

  // grab all the files from the package and resolve them to absolute paths
  return (
    pkg?.files.map((file) => {
      // all files are relative to basePath
      return resolve(basePath, file);
    }) ?? []
  );
}

function getPackageEntry(
  order: { packages: PackageEntry[] },
  selectedPackageName: string
): string | undefined {
  return order.packages.find((pkg) => pkg.name === selectedPackageName)?.files.join('\n');
}

function shouldRunGraphTask(source?: string): boolean {
  // source is explicit and doesnt leverage this task so skip it
  return !source;
}
