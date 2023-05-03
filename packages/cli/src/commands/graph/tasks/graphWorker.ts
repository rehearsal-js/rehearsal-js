import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { extname, join, relative } from 'node:path';

// eslint-disable-next-line no-restricted-imports
import { getMigrationOrder } from '@rehearsal/migration-graph';
import type { PackageEntry } from '../../../types.js';

if (!isMainThread && (!process.env['TEST'] || process.env['TEST'] === 'false')) {
  const { srcDir, basePath } = JSON.parse(workerData) as { basePath: string; srcDir: string };

  const ordered = getMigrationOrder(srcDir, { basePath, eager: true });
  parentPort?.postMessage(intoGraphOutput(ordered, srcDir));
}

export function intoGraphOutput(
  sortedFiles: import('@rehearsal/migration-graph').SourceFile[],
  basePath = process.cwd()
): {
  packages: PackageEntry[];
} {
  let currentPackage;
  let packages: { name: string; files: string[] }[] = [];
  const seenFiles: Set<string> = new Set();

  for (const file of sortedFiles) {
    if (currentPackage !== file.packageName) {
      currentPackage = file.packageName;
      packages.push({ name: relative(basePath, file.packageName) || basePath, files: [] });
    }

    const ext = extname(file.relativePath);

    if ((ext === '.js' || ext === '.gjs') && !seenFiles.has(file.relativePath)) {
      seenFiles.add(file.relativePath);
      packages[packages.length - 1].files.push(
        relative(process.cwd(), join(basePath, file.relativePath))
      );
    }
  }

  packages = packages.filter((pkg) => pkg.files.length > 0);

  return { packages };
}
