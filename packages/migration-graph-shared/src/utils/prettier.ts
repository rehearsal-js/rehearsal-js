import { existsSync, readFileSync } from 'node:fs';
import { findUpSync } from 'find-up';
import { format, Options } from 'prettier';

/**
 * Runs prettier on a source string
 *
 * @name runPrettier
 * @param {string} source
 * @param {string} filePath
 */
export function formatter(source: string, filePath: string): string {
  // Attempt to find prettier config
  const maybePrettierConfig = findUpSync('.prettierrc');

  let prettierConfig = '{}';

  if (maybePrettierConfig && existsSync(maybePrettierConfig)) {
    prettierConfig = readFileSync(maybePrettierConfig, 'utf8');
  } else {
    console.warn('No .prettierrc found. Using default');
  }

  const DEFAULT_PRETTIER_CONFIG = JSON.parse(prettierConfig) as Options;

  return format(source, {
    ...DEFAULT_PRETTIER_CONFIG,
    filepath: filePath,
  });
}
