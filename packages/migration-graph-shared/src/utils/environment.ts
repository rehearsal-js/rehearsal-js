/**
 * Whether we're in the test environment, determined by the
 * `PACKAGE_UTILS_TESTING` environment variable
 *
 * @returns {Boolean}
 */
export function isTesting(): boolean {
  return process.env.PACKAGE_UTILS_TESTING == 'true';
}

/**
 * Sets up the test environment; ie, sets the `PACKAGE_UTILS_TESTING`
 * environment variable to `true`. This controls some things when running
 * the script and utils; namely, whether we memoize expensive calculations
 * to improve performance.
 *
 */
export function setupTestEnvironment(): void {
  process.env.PACKAGE_UTILS_TESTING = 'true';
}
