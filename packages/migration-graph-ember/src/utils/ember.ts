import { join, resolve } from 'path';
import { type PackageJson, readPackageJson } from '@rehearsal/migration-graph-shared';
import { writeJsonSync } from 'fs-extra';
import sortPackageJson from 'sort-package-json';

export function isApp(packageJson: PackageJson): boolean {
  return hasDevDependency(packageJson, 'ember-source') && !isAddon(packageJson);
}

function hasDevDependency(packageJson: PackageJson, packageName: string): boolean {
  return (packageJson?.devDependencies && packageJson?.devDependencies[packageName]) ?? false;
}

function hasKeyword(packageJson: PackageJson, keyword: string): boolean {
  return packageJson?.keywords?.includes(keyword) ?? false;
}

/**
 * A package is an addon if the keywords property exists and contains "ember-addon"
 *
 * @param {string} pathToPackage - the path to the addon directory
 * @returns {boolean}
 */
export function isAddon(packageJson: PackageJson): boolean {
  return hasKeyword(packageJson, 'ember-addon');
}

/**
 * A package is an engine if it is an addon, and if the keywords property contains "ember-addon"
 *
 * @param {PackageJson} packageJson - the path to the addon directory
 * @returns {boolean}
 */
export function isEngine(packageJson: PackageJson): boolean {
  return (isAddon(packageJson) && hasKeyword(packageJson, 'ember-engine')) ?? false;
}

export function getPackageMainFileName(pathToPackage: string): string {
  const result = readPackageJson(pathToPackage) as {
    main?: string;
    'ember-addon'?: { main: string };
  };

  return result['ember-addon']?.main ?? result.main ?? 'index.js';
}

/**
 * Ember addons can set a `ember-addon.main`, which takes precedence over the package.json `main`,
 * this finds the desired main entry point and requires it.
 * This also handles the default cause of using `index.js`
 * @param {string} pathToPackage - the path to the addon directory
 * @param {string} packageMain - the actual main file (index.js)
 * @param {boolean} clearCache - clear the cache before requiring
 * @returns {any} - the contents of the required file
 */
export function requirePackageMain(
  pathToPackage: string,
  packageMain: string = getPackageMainFileName(pathToPackage),
  clearCache = true
): any {
  // clear the node require cache to make sure the latest version on disk is required (i.e. after new data has been written)
  if (clearCache) {
    delete require.cache[require.resolve(resolve(pathToPackage, packageMain))];
  }
  return require(resolve(pathToPackage, packageMain));
}

export function getNameFromMain(pathToPackage: string): string {
  const addonEntryPoint = requirePackageMain(pathToPackage);
  const isFunction = typeof addonEntryPoint === 'function';
  let name;

  if (isFunction) {
    ({ name } = addonEntryPoint.prototype);
  } else {
    ({ name } = addonEntryPoint);
  }
  return name;
}

export function getModuleNameFromMain(pathToPackage: string): string {
  const addonEntryPoint = requirePackageMain(pathToPackage);

  const isFunction = typeof addonEntryPoint === 'function';

  let moduleName;
  if (isFunction) {
    moduleName = addonEntryPoint.prototype.moduleName && addonEntryPoint.prototype.moduleName();
  } else {
    moduleName = addonEntryPoint.moduleName && addonEntryPoint.moduleName();
  }
  return moduleName;
}

export function getEmberAddonPaths(packageJson: PackageJson): string[] {
  return packageJson['ember-addon']?.paths ?? [];
}

/**
 * Ember addons can specify their "name" in a few ways.
 * All three are defined in the in main entry point of the package (index.js or a custom file)
 * - `name` as a string property
 * - `moduleName` function that returns a string
 *
 * This will find the appropriate field and return the "name" of the addon.
 * @param {string} pathToPackage - the path to the addon directory
 * @returns {string} - the name of the addon
 */
export function getEmberAddonName(pathToPackage: string): string {
  const name = getNameFromMain(pathToPackage);
  const moduleName = getModuleNameFromMain(pathToPackage);
  return moduleName ?? name;
}

export function writePackageJsonSync(pathToPackage: string, data: Record<string, any>): void {
  const sorted: Record<any, any> = sortPackageJson(data);

  if ('ember-addon' in sorted) {
    sorted['ember-addon'] = sortPackageJson(sorted['ember-addon']);

    // sort `ember-addon.paths`
    if (Array.isArray(sorted['ember-addon'].paths)) {
      sorted['ember-addon'].paths = sorted['ember-addon'].paths.sort();
    }
  }

  const pathToPackageJson = join(pathToPackage, 'package.json');

  writeJsonSync(pathToPackageJson, sorted, { spaces: 2 });
}
