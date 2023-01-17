/* eslint-disable @typescript-eslint/no-explicit-any */
import { resolve, join } from 'path';
import { readJsonSync, writeJsonSync } from 'fs-extra';
import sortPackageJson from 'sort-package-json';
import { sync as fastGlobSync } from 'fast-glob';

import { removeNestedPropertyValue, setNestedPropertyValue } from '../utils/pojo';
import { getWorkspaceGlobs } from '../utils/workspace';
import { PackageGraph } from './package-graph';

import type { IPackage } from './IPackage';
import type { Graph } from '../graph';
import type { ModuleNode } from '../types';

export type PackageJson = Record<string, any>;

// TODO evaluate if the packageContainer is actually needed
export type PackageContainer = {
  isWorkspace?: (...args: any) => boolean;
  addWorkspaceGlob?: (...args: any) => unknown;
};

export type PackageOptions = {
  packageType?: string;
  packageContainer?: PackageContainer;
  rootPackagePath?: string;
  name?: string;
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
export class Package implements IPackage {
  /**
   * path {string} - the path to this package
   */
  #packagePath: string;

  /**
   * Internal representation of package.json
   */
  #packageJson: PackageJson | undefined;

  #packageType: string;

  #packageContainer: PackageContainer;

  #name: string;

  #excludePatterns: Set<string>;

  #includePatterns: Set<string>;

  protected graph: Graph<ModuleNode> | undefined;

  constructor(
    packagePath: string,
    { name = '', packageContainer, packageType = '' }: PackageOptions = {}
  ) {
    this.#packagePath = packagePath;
    this.#packageType = packageType;
    this.#name = name;

    if (packageContainer) {
      this.#packageContainer = packageContainer;
    } else {
      this.#packageContainer = { isWorkspace: () => false };
    }

    this.#excludePatterns = new Set(['dist', 'test', 'tests']);
    this.#includePatterns = new Set(['.']);
  }

  get excludePatterns(): Set<string> {
    return this.#excludePatterns;
  }

  set excludePatterns(patterns: Set<string>) {
    this.#excludePatterns = new Set(patterns);
  }

  get includePatterns(): Set<string> {
    return this.#includePatterns;
  }

  set includePatterns(patterns: Set<string>) {
    this.#includePatterns = new Set(patterns);
  }

  get path(): string {
    return this.#packagePath;
  }

  set packageType(packageType: string) {
    this.#packageType = packageType;
  }

  get type(): string {
    return this.#packageType;
  }

  set packageContainer(container) {
    this.#packageContainer = container;
  }

  get packageContainer(): PackageContainer {
    return this.#packageContainer;
  }

  get packageName(): string {
    return this.#name || this.packageJson?.name;
  }

  get isWorkspace(): any {
    if (!this.#packageContainer || !this.#packageContainer.isWorkspace) {
      throw new Error(
        'Unable to determine if Package.isWorkspace; packageContainer is not defined.'
      );
    }

    return this.#packageContainer.isWorkspace(this.path);
  }

  get packageJson(): PackageJson {
    if (!this.#packageJson) {
      const packageJsonPath = resolve(this.path, 'package.json');
      this.#packageJson = readJsonSync(packageJsonPath);
    }
    return this.#packageJson as PackageJson;
  }

  /**
   * EXPLICIT DEPENDENCIES
   * These the items listed in package.json, different from *required*
   * dependencies which are actually _used_ by the package (i.e. referenced in the code)
   *
   * It is technically possible to have zero dependencies
   * @return dependencies {object|undefined}
   */
  get dependencies(): Record<string, string> {
    // get the dependencies from package.json
    return this.packageJson?.dependencies;
  }

  /**
   * These the items listed in package.json
   *
   * It is technically possible to have zero devDependencies
   * @return dependencies {object|undefined}
   */
  get devDependencies(): Record<string, string> {
    // get the dependencies from package.json
    return this.packageJson?.devDependencies;
  }

  /**
   * Return any workspace globs this package might have.
   */
  get workspaceGlobs(): [string] {
    return getWorkspaceGlobs(this.path);
  }

  addWorkspaceGlob(glob: string): this {
    const pkg = this.packageJson;
    if (!pkg.workspaces) {
      pkg.workspaces = [];
    }
    pkg.workspaces.push(glob);
    return this;
  }

  addIncludePattern(...patterns: string[]): this {
    patterns.forEach((pattern) => this.#includePatterns.add(pattern));
    return this;
  }

  addExcludePattern(...patterns: string[]): this {
    patterns.forEach((pattern) => this.#excludePatterns.add(pattern));
    return this;
  }

  setPackageName(name: string): this {
    this.packageJson.name = name;
    this.#name = name;
    return this;
  }

  /**
   * ex, addPackageJsonKey('foo.bar.baz', 5) ->
   *  { foo: {bar: {baz: 5}}}
   */
  addPackageJsonKey(key: string, value = {}): this {
    // update the package to add the thing
    setNestedPropertyValue(this.packageJson, key.split('.'), value);
    return this;
  }

  removePackageJsonKey(key: string): this {
    // update the package to remove the thing
    removeNestedPropertyValue(this.packageJson, key.split('.'));
    return this;
  }

  addDependency(packageName: string, version: string): this {
    // add to dependencies
    let _dependencies = this.dependencies;
    if (!_dependencies) {
      this.packageJson.dependencies = {};
      _dependencies = this.packageJson.dependencies;
    }
    _dependencies[packageName] = version;
    return this;
  }

  removeDependency(packageName: string): this {
    // remove from dependencies
    delete this.packageJson?.dependencies?.[packageName];
    return this;
  }

  addDevDependency(packageName: string, version: string): this {
    let _devDependencies = this.devDependencies;
    if (!_devDependencies) {
      this.packageJson.devDependencies = {};
      _devDependencies = this.packageJson.devDependencies;
    }
    _devDependencies[packageName] = version;
    return this;
  }

  removeDevDependency(packageName: string): this {
    delete this.devDependencies?.[packageName];
    return this;
  }

  /**
   * Write the packageJson data to disk.
   * Writes a async, unlikes reads which are sync, so consumers of this could write
   * multiple packages at once.
   */
  writePackageJsonToDisk(): void {
    const sorted: Record<any, any> = sortPackageJson(this.packageJson);
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
    const hasTSConfig = fastGlobSync('tsconfig.json', fastGlobConfig);
    // if there aren't any .js files in addon (minus the ignore list)
    const hasJS = fastGlobSync('**/*.js', fastGlobConfig);

    if (!!hasTSConfig?.length && !hasJS?.length) {
      return true;
    }
    return false;
  }

  hasModuleGraph(): boolean {
    return this.graph !== undefined;
  }

  getModuleGraph(options = {}): Graph<ModuleNode> {
    if (this.graph) {
      return this.graph;
    }

    this.graph = new PackageGraph(this, options).discover();

    return this.graph;
  }
}
