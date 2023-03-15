import { join, resolve } from 'path';
import { Module } from 'node:module';
import { type PackageJson, readPackageJson } from '@rehearsal/migration-graph-shared';
import { writeJsonSync } from 'fs-extra/esm';
import sortPackageJson from 'sort-package-json';

const require = Module.createRequire(import.meta.url);

export function isApp(packageJson: PackageJson): boolean {
  return hasDevDependency(packageJson, 'ember-source') && !isAddon(packageJson);
}

function hasDevDependency(packageJson: PackageJson, packageName: string): boolean {
  return !!(packageJson?.devDependencies && packageName in packageJson.devDependencies) ?? false;
}

function hasKeyword(packageJson: PackageJson, keyword: string): boolean {
  return !!(
    packageJson?.keywords &&
    Array.isArray(packageJson.keywords) &&
    packageJson.keywords.includes(keyword)
  );
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

type EmberMainModule = {
  name?: string;
  moduleName?(): string;
};

/**
 * Ember addons can set a `ember-addon.main`, which takes precedence over the package.json `main`,
 * this finds the desired main entry point and requires it.
 * This also handles the default cause of using `index.js`
 * @param {string} pathToPackage - the path to the addon directory
 * @param {string} packageMain - the actual main file (index.js)
 * @param {boolean} clearCache - clear the cache before requiring
 */
export function requirePackageMain(
  pathToPackage: string,
  packageMain: string = getPackageMainFileName(pathToPackage)
): EmberMainModule {
  return require(resolve(pathToPackage, packageMain)) as EmberMainModule;
}

export function getNameFromMain(pathToPackage: string): string | undefined {
  const addonEntryPoint = requirePackageMain(pathToPackage);

  // presence of this method idicates that the module names in code are different
  // than the actual module name in package.json
  if (addonEntryPoint.moduleName) {
    return addonEntryPoint.moduleName();
  }

  return addonEntryPoint.name;
}

export function getModuleNameFromMain(pathToPackage: string): string {
  const addonEntryPoint = requirePackageMain(pathToPackage);

  const isFunction = typeof addonEntryPoint === 'function';

  let moduleName;
  if (isFunction) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    moduleName = addonEntryPoint.prototype.moduleName && addonEntryPoint.prototype.moduleName();
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    moduleName = addonEntryPoint.moduleName && addonEntryPoint.moduleName();
  }
  return moduleName as string;
}

type WithField<T extends Record<string, unknown>, K extends keyof T> = Required<Pick<T, K>> & T;

function hasPath(packageJson: PackageJson): packageJson is WithField<PackageJson, 'ember-addon'> {
  return !!(
    'ember-addon' in packageJson &&
    packageJson['ember-addon'] &&
    'paths' in packageJson['ember-addon']
  );
}

export function getEmberAddonPaths(packageJson: PackageJson): string[] {
  if (hasPath(packageJson)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return packageJson['ember-addon'].paths;
  }

  return [];
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
export function getEmberAddonName(pathToPackage: string): string | undefined {
  return getNameFromMain(pathToPackage);
}

export function writePackageJsonSync(pathToPackage: string, data: PackageJson): void {
  const sorted = sortPackageJson(data);

  if ('ember-addon' in sorted) {
    sorted['ember-addon'] = sortPackageJson<WithField<PackageJson, 'ember-addon'>>(
      sorted['ember-addon']
    );

    // sort `ember-addon.paths`
    if (hasPath(sorted)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      sorted['ember-addon'].paths = sorted['ember-addon'].paths.sort();
    }
  }

  const pathToPackageJson = join(pathToPackage, 'package.json');

  writeJsonSync(pathToPackageJson, sorted, { spaces: 2 });
}
