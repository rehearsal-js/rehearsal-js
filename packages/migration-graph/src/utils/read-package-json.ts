import { readJsonSync } from 'fs-extra/esm';
import type { PackageJson } from 'type-fest';

const PACKAGE_JSON_CACHE = new Map<string, EmberSpecificPackageJson>();

export function readPackageJson(pathToPackage: string): EmberSpecificPackageJson {
  const cached = PACKAGE_JSON_CACHE.get(pathToPackage);

  if (cached) {
    return cached;
  }

  const result = readJsonSync(pathToPackage) as PackageJson & {
    'ember-addon'?: { paths?: string[] };
  };

  PACKAGE_JSON_CACHE.set(pathToPackage, result);

  return result;
}

export type EmberSpecificPackageJson = PackageJson & {
  'ember-addon'?: { paths?: string[]; version?: number };
};
