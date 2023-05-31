import { findUpSync } from 'find-up';

const PACKAGE_JSON_CACHE = new Map<string, string | undefined>();

export function findPackageJson(dirName: string): string | undefined {
  if (PACKAGE_JSON_CACHE.has(dirName)) {
    return PACKAGE_JSON_CACHE.get(dirName);
  }

  const result = findUpSync('package.json', { cwd: dirName });
  PACKAGE_JSON_CACHE.set(dirName, result);
  return result;
}
