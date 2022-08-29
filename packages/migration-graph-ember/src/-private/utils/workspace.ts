import micromatch from 'micromatch';
import { readJsonSync } from 'fs-extra';
import { resolve, join } from 'path';

/**
 * Gets all workspace globs from the `mpRoot`'s `package.json`
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
 * Given an MP root, returns whether the path to the provided `package.json`
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
