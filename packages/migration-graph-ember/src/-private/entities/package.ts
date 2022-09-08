/* eslint-disable @typescript-eslint/no-explicit-any */
import { readJsonSync } from 'fs-extra';
import { resolve } from 'path';

import { type PackageContainer } from '../types/package-container';
import { writePackageJsonSync } from '../utils/ember';
import { removeNestedPropertyValue, setNestedPropertyValue } from '../utils/pojo';
import { getWorkspaceGlobs } from '../utils/workspace';

export type PackageJson = Record<string, any>;

export type PackageOptions = {
  type?: string;
  packageContainer?: PackageContainer;
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
 *    - setModuleName
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
  #path;

  /**
   * Internal representation of package.json
   */
  #pkg: PackageJson;

  #type: string;

  #packageContainer: PackageContainer;

  constructor(pathToPackage: string, { type = '', packageContainer }: PackageOptions = {}) {
    this.#path = pathToPackage;
    this.#type = type;

    if (packageContainer) {
      this.#packageContainer = packageContainer;
    }
  }

  set type(_type) {
    this.#type = _type;
  }

  get type(): string {
    return this.#type;
  }

  set path(_path) {
    this.#path = _path;
  }

  get path(): string {
    return this.#path;
  }

  set packageContainer(container) {
    this.#packageContainer = container;
  }

  get packageContainer(): PackageContainer {
    return this.#packageContainer;
  }

  get location(): string {
    return this.#path;
  }

  get packagePath(): string {
    return this.#path;
  }

  get packageName(): string {
    return this.packageJson?.name;
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
    if (this.#pkg == undefined) {
      const packageJsonPath = resolve(this.path, 'package.json');
      this.#pkg = readJsonSync(packageJsonPath);
    }

    return this.#pkg;
  }

  getPackageJson(): PackageJson {
    return this.packageJson;
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

  setPackageName(name: string): this {
    this.packageJson.name = name;
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
      this.#pkg.dependencies = {};
      _dependencies = this.#pkg?.dependencies;
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
      this.#pkg.devDependencies = {};
      _devDependencies = this.#pkg.devDependencies;
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
    writePackageJsonSync(this.path, this.packageJson);
  }
}
