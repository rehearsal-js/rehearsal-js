import { resolve } from 'node:path';
import { readJsonSync } from 'fs-extra/esm';

export function readPackageJson(pathToPackage: string): Record<string, unknown> {
  return readJsonSync(resolve(pathToPackage, 'package.json'));
}

export { Package, type PackageOptions, type PackageJson } from './entities/package.js';
export { formatter } from './utils/prettier.js';
export * from './utils/workspace.js';
export { setNestedPropertyValue, removeNestedPropertyValue } from './utils/pojo.js';

export * from './graph/index.js';
export * from './types.js';
export { PackageGraph, PackageGraphOptions } from './entities/package-graph.js';
export { ProjectGraph, ProjectGraphOptions } from './entities/project-graph.js';

export type { IPackage } from './entities/IPackage.js';
