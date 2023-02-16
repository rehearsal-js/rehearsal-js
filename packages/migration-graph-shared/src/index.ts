import { resolve } from 'path';
import { readJsonSync } from 'fs-extra';

export function readPackageJson(pathToPackage: string): Record<string, unknown> {
  return readJsonSync(resolve(pathToPackage, 'package.json'));
}

export { Package, type PackageOptions, type PackageJson } from './entities/package';
export { formatter } from './utils/prettier';
export * from './utils/workspace';
export { setNestedPropertyValue, removeNestedPropertyValue } from './utils/pojo';

export * from './graph';
export * from './types';
export { PackageGraph, PackageGraphOptions } from './entities/package-graph';
export { ProjectGraph, ProjectGraphOptions } from './entities/project-graph';

export { IPackage } from './entities/IPackage';
