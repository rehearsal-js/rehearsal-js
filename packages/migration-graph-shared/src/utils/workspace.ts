import { join, resolve } from 'path';
import { readJsonSync } from 'fs-extra';
import micromatch from 'micromatch';

/**
 * Gets all workspace globs from the the root `package.json`
 *
 * @name getWorkspaceGlobs
 * @param {string} pathToRoot The absolute path to root of the repo
 * @returns {string[]} An array of globs
 */
export function getWorkspaceGlobs(pathToRoot: string): [string] {
  const packageJson = readJsonSync(resolve(pathToRoot, 'package.json'));
  return (packageJson.workspaces || []).map((glob: string) => join(pathToRoot, glob));
}

/**
 * Given project root, returns whether the path to the provided `package.json`
 * is a workspace
 *
 * @name isWorkspace
 * @param {string} pathToRoot The absolute path to root of the repo
 * @param {string} pathToPackage The path to the package
 * @returns {boolean} Whether or not `pathToPackageJson` represents a workspace
 */
export function isWorkspace(pathToRoot: string, pathToPackage: string): boolean {
  return micromatch.isMatch(pathToPackage, getWorkspaceGlobs(pathToRoot));
}
