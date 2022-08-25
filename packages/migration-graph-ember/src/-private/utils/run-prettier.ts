// Using 5.0.0 of find-up because tests are not in ESM will bump to 6.* when migrated to vitest.
import { sync } from 'find-up';
import { existsSync, readFileSync } from 'fs';
import { format } from 'prettier';

/**
 * Runs prettier on a source string
 *
 * @name runPrettier
 * @param {string} source
 * @param {string} filePath
 */
export function runPrettier(source: string, filePath: string): string {
  // Attempt to find prettier config
  const maybePrettierConfig = sync('.prettierrc');

  let prettierConfig = '{}';

  if (maybePrettierConfig && existsSync(maybePrettierConfig)) {
    prettierConfig = readFileSync(maybePrettierConfig, 'utf8');
  } else {
    console.warn('No .prettierrc found. Using default');
  }

  const DEFAULT_PRETTIER_CONFIG = JSON.parse(prettierConfig);

  return format(source, {
    ...DEFAULT_PRETTIER_CONFIG,
    filepath: filePath,
  });
}
