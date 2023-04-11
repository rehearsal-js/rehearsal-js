import { readJsonSync } from 'fs-extra/esm';
import findupSync from 'findup-sync';
import type { PackageJson } from 'type-fest';

export function readPackageJson(pathToPackage: string): PackageJson {
  const pkgJson = findupSync('package.json', { cwd: pathToPackage });

  if (!pkgJson) {
    throw new Error('Cannot find package.json');
  }
  return readJsonSync(pkgJson) as PackageJson;
}

export { Package, type PackageOptions, onlyPackage } from './entities/package.js';
export { formatter } from './utils/prettier.js';
export * from './utils/workspace.js';

export * from './graph/index.js';
export * from './types.js';
export { PackageGraph, PackageGraphOptions } from './entities/package-graph.js';
export { ProjectGraph, ProjectGraphOptions } from './entities/project-graph.js';

export type { IPackage } from './entities/IPackage.js';

export * from './utils/excludes.js';
