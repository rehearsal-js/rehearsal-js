import path from 'path';
import * as t from '@babel/types';
import * as parser from '@babel/parser';
import { runPrettier } from './run-prettier';
import { default as generate } from '@babel/generator';
import fs from 'fs-extra';
import sortPackageJson from 'sort-package-json';
import { writeJsonSync, readJsonSync } from 'fs-extra';
import { resolve } from 'path';


/**
 * A package is an addon if the keywords property exists and contains "ember-addon"
 *
 * @param {string} pathToPackage - the path to the addon directory
 * @returns {boolean}
 */
export function isAddon(pathToPackage: string): boolean {
  const packageJSONData = readJsonSync(resolve(pathToPackage, 'package.json'));
  return packageJSONData?.keywords?.includes('ember-addon') ?? false;
}

/**
 * A package is an engine if it is an addon, and if the keywords property contains "ember-addon"
 *
 * @param {string} pathToPackage - the path to the addon directory
 * @returns {boolean}
 */
export function isEngine(pathToPackage: string): boolean {
  const packageJSONData = readJsonSync(resolve(pathToPackage, 'package.json'));
  return (isAddon(pathToPackage) && packageJSONData?.keywords?.includes('ember-engine')) ?? false;
}

export function getPackageMainFileName(pathToPackage: string): string {
  const { main, 'ember-addon': emberAddon = {} } = readJsonSync(resolve(pathToPackage, 'package.json'));

  return emberAddon?.main ?? main ?? 'index.js';
}

/**
 * Ember addons can set a `ember-addon.main`, which takes precedence over the package.json `main`,
 * this finds the desired main entry point and requires it.
 * This also handles the default cause of using `index.js`
 * @param {string} pathToPackage - the path to the addon directory
 * @param {string} packageMain - the actual main file (index.js)
 * @param {boolean} clearCache - clear the cache before requiring
 * @returns {string} - the contents of the required file
 */
export function requirePackageMain(
  pathToPackage: string,
  packageMain: string = getPackageMainFileName(pathToPackage),
  clearCache = true
) {
  // clear the node require cache to make sure the latest version on disk is required (i.e. after new data has been written)
  if (clearCache) {
    delete require.cache[require.resolve(path.resolve(pathToPackage, packageMain))];
  }
  return require(path.resolve(pathToPackage, packageMain));
}

export function getPackageMainAST(
  pathToPackage: string,
  packageMain = getPackageMainFileName(pathToPackage)
): parser.ParseResult<t.File> {
  const somePath = path.resolve(pathToPackage, packageMain);
  const content = fs.readFileSync(somePath, 'utf-8');
  return parser.parse(content, {
    sourceFilename: packageMain,
  });
}

// export type ConfigurationObject =  Expression | SpreadElement | JSXNamespacedName | ArgumentPlaceholder;
export type ConfigurationObject = any; // TODO: Fix this

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

  /* @ts-ignore */
  if (node?.left?.property?.name === 'exports') {
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
) {
  const somePath = path.resolve(pathToPackage, packageMain);

  // if prettier is required, run it on the generated string from generate: ex. prettier(generate())
  const content = runPrettier(generate(packageMainAST).code, packageMain);

  return fs.writeFileSync(somePath, content, {
    encoding: 'utf8',
  });
}

export function getNameFromMain(pathToPackage: string) {
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

export function getModuleNameFromMain(pathToPackage: string) {
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
export function getEmberAddonName(pathToPackage: string) {
  const name = getNameFromMain(pathToPackage);
  const moduleName = getModuleNameFromMain(pathToPackage);
  return moduleName ?? name;
}

export function writePackageJsonSync(pathToPackage: string, data: {}) {
  const sorted: Record<any, any> = sortPackageJson(data);

  if ('ember-addon' in sorted) {
    sorted['ember-addon'] = sortPackageJson(sorted['ember-addon']);

    // sort `ember-addon.paths`
    if (Array.isArray(sorted['ember-addon'].paths)) {
      sorted['ember-addon'].paths = sorted['ember-addon'].paths.sort();
    }
  }

  const pathToPackageJson = path.join(pathToPackage, 'package.json');

  return writeJsonSync(pathToPackageJson, sorted, { spaces: 2 });
}