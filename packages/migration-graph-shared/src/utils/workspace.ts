import { join } from 'path';
import micromatch from 'micromatch';
import { readPackageJson } from '../index';

/**
 * Gets all workspace globs from the the root `package.json`
 *
 * @name getWorkspaceGlobs
 * @param {string} pathToRoot The absolute path to root of the repo
 * @returns {string[]} An array of globs
 */
export function getWorkspaceGlobs(pathToRoot: string): string[] {
  const packageJson = readPackageJson(pathToRoot);

  if (!packageJson) {
    return [];
  }

  const workspaces = (packageJson.workspaces as Array<string>) ?? [];

  return workspaces.map((glob: string) => join(pathToRoot, glob));
}

export function hasWorkspaceGlobs(pathToRoot: string): boolean {
  return getWorkspaceGlobs(pathToRoot).length > 0;
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
