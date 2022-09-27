/* eslint-disable @typescript-eslint/no-explicit-any */
import { default as generate } from '@babel/generator';
import * as parser from '@babel/parser';
import * as t from '@babel/types';
import { formatter, PackageJson, readPackageJson } from '@rehearsal/migration-graph-shared';
import { readFileSync, writeFileSync, writeJsonSync } from 'fs-extra';
import { join, resolve } from 'path';
import sortPackageJson from 'sort-package-json';

export function isApp(packageJson: PackageJson): boolean {
  return packageJson['ember'] && !isAddon(packageJson);
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
export function isAddon(packageJson: Record<string, any>): boolean {
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
  const { main, 'ember-addon': emberAddon = {} } = readPackageJson(pathToPackage);
  return emberAddon?.main ?? main ?? 'index.js';
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

export function getPackageMainAST(
  pathToPackage: string,
  packageMain = getPackageMainFileName(pathToPackage)
): parser.ParseResult<t.File> {
  const somePath = resolve(pathToPackage, packageMain);
  const content = readFileSync(somePath, 'utf-8');
  return parser.parse(content, {
    sourceFilename: packageMain,
  });
}

// export type ConfigurationObject =
//   | Expression
//   | SpreadElement
//   | JSXNamespacedName
//   | ArgumentPlaceholder;
export type ConfigurationObject = any;

/**
 * The variations will be hardcoded as they come up, so far there are:
 * ```
 *  module.exports = {};
 *  module.exports = function({})
 *  module.exports = function('string', {})
 *  module.exports = function('string', [Class].extend({})
 * ```
 */

export function getPackageMainExportConfigFromASTNode(
  node: t.AssignmentExpression
): ConfigurationObject | undefined {
  let configurationObject: ConfigurationObject | undefined;

  // TODO FIX THESE TYPINGS
  // based on babel parser this node AddignmentExpression should have left.property.name
  // however the typings from @babel/types show they do not
  const memberExpression = node.left as t.MemberExpression;
  const memberIdentifier = memberExpression.property as t.Identifier;

  if (memberIdentifier.name === 'exports') {
    // object case
    // simple object as second param
    if (node.right.type === 'ObjectExpression') {
      configurationObject = node.right;
    } else if (node.right.type === 'CallExpression') {
      const exportFunctionArguments = node.right.arguments;

      // module.exports = addon({})
      if (exportFunctionArguments[0].type === 'ObjectExpression') {
        [configurationObject] = exportFunctionArguments;
      }
      // TODO Rename this; module.exports = voyagerAddon(__dirname, {})
      else if (exportFunctionArguments[1].type === 'ObjectExpression') {
        [, configurationObject] = exportFunctionArguments;
      }
      // TODO Rename this; module.exports = voyagerAddon(__dirname, BPREngineAddon.extend({});
      else if (exportFunctionArguments[1].type === 'CallExpression') {
        [configurationObject] = exportFunctionArguments[1].arguments;
      }
    }
  }

  return configurationObject;
}

export function writePackageMain(
  pathToPackage: string,
  packageMainAST: t.Node,
  packageMain = getPackageMainFileName(pathToPackage)
): void {
  const somePath = resolve(pathToPackage, packageMain);

  const content = formatter(generate(packageMainAST).code, packageMain);

  writeFileSync(somePath, content, {
    encoding: 'utf8',
  });
}

export function getNameFromMain(pathToPackage: string): any {
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

export function getModuleNameFromMain(pathToPackage: string): any {
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
export function getEmberAddonName(pathToPackage: string): any {
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
