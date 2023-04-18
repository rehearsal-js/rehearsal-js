import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { extname, relative } from 'node:path';

// eslint-disable-next-line no-restricted-imports
import { getMigrationOrder } from '@rehearsal/migration-graph';

if (!isMainThread) {
  const basePath = workerData as string;

  const ordered = getMigrationOrder(basePath);
  parentPort?.postMessage(intoGraphOutput(ordered));
}

export type PackageEntry = { name: string; files: string[] };

export function intoGraphOutput(sortedFiles: import('@rehearsal/migration-graph').SourceFile[]): {
  packages: PackageEntry[];
} {
  let currentPackage;
  let packages: { name: string; files: string[] }[] = [];
  const seenFiles: Set<string> = new Set();

  for (const file of sortedFiles) {
    if (currentPackage !== file.packageName) {
      currentPackage = file.packageName;
      packages.push({ name: relative(process.cwd(), file.packageName), files: [] });
    }

    const ext = extname(file.relativePath);

    if ((ext === '.js' || ext === '.gjs') && !seenFiles.has(file.relativePath)) {
      seenFiles.add(file.relativePath);
      packages[packages.length - 1].files.push(file.relativePath);
    }
  }

  packages = packages.filter((pkg) => pkg.files.length > 0);

  return { packages };
}
