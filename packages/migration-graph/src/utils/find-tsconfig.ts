import { findUpSync } from 'find-up';

const TSCONFIG_CACHE = new Map<string, string | undefined>();

export function findTsConfig(dirName: string): string | undefined {
  if (TSCONFIG_CACHE.has(dirName)) {
    return TSCONFIG_CACHE.get(dirName);
  }

  const result = findUpSync('tsconfig.json', { cwd: dirName });
  TSCONFIG_CACHE.set(dirName, result);
  return result;
}
