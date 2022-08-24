// Using 5.0.0 of find-up because tests are not in ESM will bump to 6.* when migrated to vitest.
import findUp from 'find-up';
import fs from 'fs';
import prettier from 'prettier';

/**
 * Runs prettier on a source string
 *
 * @name runPrettier
 * @param {string} source
 * @param {string} filePath
 */
export function runPrettier(source: string, filePath: string) {
  // Attempt to find prettier config
  const maybePrettierConfig = findUp.sync('.prettierrc');

  let prettierConfig = '{}';

  if (maybePrettierConfig && fs.existsSync(maybePrettierConfig)) {
    prettierConfig = fs.readFileSync(maybePrettierConfig, 'utf8');
  } else {
    console.warn('No .prettierrc found. Using default');
  }

  const DEFAULT_PRETTIER_CONFIG = JSON.parse(prettierConfig);

  return prettier.format(source, {
    ...DEFAULT_PRETTIER_CONFIG,
    filepath: filePath,
  });
}
