import { resolve, join, relative } from 'node:path';
import { existsSync } from 'node:fs';
import { assert } from 'node:console';
import { readJsonSync, writeJsonSync } from 'fs-extra/esm';
import sortPackageJson from 'sort-package-json';
import fastGlob from 'fast-glob';

import { getWorkspaceGlobs } from '../utils/workspace.js';
import { getExcludePatterns } from '../index.js';
import { PackageGraph, PackageGraphOptions } from './package-graph.js';

import type { Graph } from '../graph/index.js';
import type { ModuleNode } from '../types.js';
import type { PackageJson } from 'type-fest';

export type PackageOptions = {
  packageType?: string;
  rootPackagePath?: string;
  name?: string;
  excludeWorkspaces?: boolean;
  ignoreGlobs?: string[];
};

/**
 * Package Class
 *  - constructor(path)
 *  - static methods to migrate existing stuff
 *  - manipulation functions
 *    - add/removeDependency
 *    - add/removeDevDependency
 *    - add/removeInRepoDependency
 *    - add/removeInRepoDevDependency
 *
 * Implementation Details
 *  - removeInRepo*
 *    - if workspace, manipulate deps and devDeps
 *    - else, remove addon-paths
 */
export class Package {
  /**
   * path {string} - the path to this package
   */
  path: string;
  packageJson: PackageJson;
  packageName: string;
  type: string;
  includePatterns: Set<string>;
  excludePatterns: Set<string>;
  workspaceGlobs: string[] = [];

  protected graph: Graph<ModuleNode> | undefined;

  constructor(
    path: string,
    { name = '', packageType = '', excludeWorkspaces = true, ignoreGlobs = [] }: PackageOptions = {}
  ) {
    this.path = path;
    this.type = packageType;
    this.packageName = name;
    this.excludePatterns = new Set([...getExcludePatterns(), ...ignoreGlobs]);
    this.includePatterns = new Set(['.']);

    // Only add the globs if this path contains a package.json
    if (excludeWorkspaces && existsSync(join(this.path, 'package.json'))) {
      this.workspaceGlobs = getWorkspaceGlobs(this.path) || [];

      // Add the workspace globs to the exclude pattern for the root package
      // so it doesn't attempt to add them to the root package's graph.
      this.workspaceGlobs.forEach((glob) => this.addExcludePattern(relative(this.path, glob)));
    }

    const packageJsonPath = resolve(this.path, 'package.json');
    this.packageJson = readJsonSync(packageJsonPath) as PackageJson;

    const { name: packageName } = this.packageJson;

    if (packageName) {
      this.packageName = packageName;
    } else {
      assert(packageName, `Must have a package name for package at ${path}`);
    }
  }

  /**
   * EXPLICIT DEPENDENCIES
   * These the items listed in package.json, different from *required*
   * dependencies which are actually _used_ by the package (i.e. referenced in the code)
   *
   * It is technically possible to have zero dependencies
   * @return dependencies {object|undefined}
   */
  get dependencies(): Partial<Record<string, string>> | undefined {
    // get the dependencies from package.json
    return this.packageJson.dependencies;
  }

  /**
   * These the items listed in package.json
   *
   * It is technically possible to have zero devDependencies
   * @return dependencies {object|undefined}
   */
  get devDependencies(): Partial<Record<string, string>> | undefined {
    // get the dependencies from package.json
    return this.packageJson.devDependencies;
  }

  addWorkspaceGlob(glob: string): this {
    const pkg = this.packageJson;
    if (!pkg.workspaces) {
      pkg.workspaces = [glob];
    } else if (Array.isArray(pkg.workspaces)) {
      pkg.workspaces.push(glob);
    }
    return this;
  }

  addIncludePattern(...patterns: string[]): this {
    patterns.forEach((pattern) => {
      if (this.excludePatterns.has(pattern)) {
        this.excludePatterns.delete(pattern);
      }
      this.includePatterns.add(pattern);
    });
    return this;
  }

  addExcludePattern(...patterns: string[]): this {
    patterns.forEach((pattern) => {
      if (this.includePatterns.has(pattern)) {
        this.includePatterns.delete(pattern);
      }
      this.excludePatterns.add(pattern);
    });
    return this;
  }

  /**
   * Write the packageJson data to disk.
   * Writes a async, unlikes reads which are sync, so consumers of this could write
   * multiple packages at once.
   */
  writePackageJsonToDisk(): void {
    const sorted = sortPackageJson(this.packageJson);
    const pathToPackageJson = join(this.path, 'package.json');
    writeJsonSync(pathToPackageJson, sorted, { spaces: 2 });
  }

  isConvertedToTypescript(conversionLevel?: string): boolean {
    const fastGlobConfig = {
      absolute: true,
      cwd: this.path,
      ignore: ['**/node_modules/**'],
    };
    // ignore a tests directory if we only want to consider the source
    if (conversionLevel === 'source-only') {
      fastGlobConfig.ignore.push('**/tests/**');
    }

    // ignore some common .js files unless considering "full" conversion
    if (conversionLevel !== 'full') {
      this.excludePatterns;
      fastGlobConfig.ignore.push(...this.excludePatterns);
    }

    // if there's a tsconfig
    const hasTSConfig = fastGlob.sync('tsconfig.json', fastGlobConfig);
    // if there aren't any .js files in addon (minus the ignore list)
    const hasJS = fastGlob.sync('**/*.js', fastGlobConfig);

    if (!!hasTSConfig?.length && !hasJS?.length) {
      return true;
    }
    return false;
  }

  hasModuleGraph(): boolean {
    return this.graph !== undefined;
  }

  getModuleGraph(options: PackageGraphOptions): Graph<ModuleNode> {
    if (this.graph) {
      return this.graph;
    }

    this.graph = new PackageGraph(this, options).discover();

    return this.graph;
  }
}

export function onlyPackage(element: unknown): element is Package {
  return element !== undefined;
}
