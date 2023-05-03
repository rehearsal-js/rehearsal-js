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
  options: GraphTaskOptions,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ctx?: GraphCommandContext
): ListrTask<GraphCommandContext, ListrDefaultRenderer> {
  return {
    title: 'Analyzing project dependency graph',
    options: { persistentOutput: true },
    async task(ctx: GraphCommandContext, task) {
      let order: { packages: PackageEntry[] };
      const { srcDir, output, basePath } = options;
      let selectedPackageName: string;

      if (process.env['TEST'] === 'true') {
        // Do this on the main thread because there are issues with resolving worker scripts for worker_threads in vitest
        const { intoGraphOutput } = await import('./graphWorker.js').then((m) => m);
        const { getMigrationOrder } = await import('@rehearsal/migration-graph').then((m) => m);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
        order = intoGraphOutput(getMigrationOrder(srcDir, { basePath }), srcDir);
      } else {
        order = await new Promise<{ packages: PackageEntry[] }>((resolve, reject) => {
          task.title = 'Analyzing project dependency graph ...';

          // Run graph traversal in a worker thread so the ui thread doesn't hang
          const worker = new Worker(workerPath, {
            workerData: JSON.stringify({ srcDir, basePath: options.basePath }),
          });

          worker.on('message', (packages: { packages: PackageEntry[] }) => {
            console.log(packages);
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

      // if explicit child package is passed in use that
      if (ctx?.childPackage) {
        ctx.jsSourcesAbs = getGraphFilesAbs(srcDir, ctx.childPackage, order.packages[0].files);

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

// get all the js | gjs files from the graph and return as absolute paths. the graph will filter the extensions
function getGraphFilesAbs(basePath: string, childPackage: string, files: string[]): string[] {
  // filter out files that are not in the child package
  files = files.filter((file) => file.startsWith(childPackage));

  return (
    files.map((file) => {
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
