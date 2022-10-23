import { resolve } from 'path';
import { readJsonSync } from 'fs-extra';

import { PackageJson } from './entities/package';

export function readPackageJson(pathToPackage: string): PackageJson {
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
