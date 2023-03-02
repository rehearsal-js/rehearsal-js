import { isAbsolute, relative } from 'node:path';

export function normalizeFilePath(basePath: string, filepath: string): string {
  if (isAbsolute(filepath)) {
    return relative(basePath, filepath);
  }

  return filepath;
}
