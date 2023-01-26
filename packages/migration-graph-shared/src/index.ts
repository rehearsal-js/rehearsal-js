import { resolve } from 'path';
import { readJsonSync } from 'fs-extra';

export function readPackageJson(pathToPackage: string): Record<string, any> {
  return readJsonSync(resolve(pathToPackage, 'package.json'));
}

export {
  Package,
  type PackageOptions,
  type PackageContainer,
  type PackageJson,
} from './entities/package';
export { formatter } from './utils/prettier';
export { isWorkspace } from './utils/workspace';
export { setNestedPropertyValue, removeNestedPropertyValue } from './utils/pojo';
export { isTesting, setupTestEnvironment } from './utils/environment';

export * from './graph';
export * from './types';
export { PackageGraph, PackageGraphOptions } from './entities/package-graph';
export { ProjectGraph, ProjectGraphOptions } from './entities/project-graph';

export { IPackage } from './entities/IPackage';
