import { readJsonSync } from 'fs-extra/esm';
import type { PackageJson } from 'type-fest';

export function readPackageJson(
  pathToPackage: string
): PackageJson & { 'ember-addon'?: { paths?: string[] } } {
  return readJsonSync(pathToPackage) as PackageJson & {
    'ember-addon'?: { paths?: string[] };
  };
}
