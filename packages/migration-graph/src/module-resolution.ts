import { resolve, join } from 'path';
import { readJsonSync, existsSync } from 'fs-extra';

/**
 * Will return true if a module is a relative path (e.g. starts with '.','../', '/')
 * @param moduleName
 * @returns true if the moduleName is a relative path, otherwise false
 */
export function isModuleRelative(moduleName: string) {
  // moduleName is relative e.g '.', '../', '/'
  return moduleName.startsWith('.') || moduleName.startsWith('../') || moduleName.startsWith('/');
}

/**
 * @param moduleName a string for the module name
 * @returns true if it's a external package e.g. non-relative path
 */
export function isModuleNonRelative(moduleName: string) {
  return moduleName.startsWith('@') || !isModuleRelative(moduleName);
}

export function isDirectoryPackage(someDir: string) {
  return existsSync(join(someDir, 'package.json'));
}

export function getMainEntrypoint(baseUrl: string): string {
  // Find package.json
  const packageJson = readJsonSync(resolve(baseUrl, 'package.json'));

  return packageJson?.main;
}

/**
 *
 * @param moduleName string the value for the moduleName from an import statement;
 * @param context
 * @param context.source string the file this module is being imported in
 * @returns string path to the module
 *
 * @see {@link https://www.typescriptlang.org/docs/handbook/module-resolution.html#node}
 */
export function resolveRelativeModule(
  moduleName: string = './index',
  { currentDir = '.' }: { currentDir: string }
): string {
  // If it's from a package or non-relative, then skip
  if (isModuleNonRelative(moduleName)) {
    throw new Error(`${moduleName} is external`);
  }

  // Ask the file named /root/src/moduleB.js, if it exists.

  let modulePath = join(
    currentDir,
    moduleName.includes('.js') ? moduleName : moduleName + '.js'
  );

  if (existsSync(modulePath)) {
    return modulePath;
  }

  const dirPath = join(currentDir, moduleName);

  if (isDirectoryPackage(dirPath)) {
    return join(currentDir, moduleName, getMainEntrypoint(dirPath));
  }

  modulePath = join(dirPath, 'index.js');

  if (!existsSync(modulePath)) {
    throw new Error(`Unable to resolve non-relative path for ${moduleName}`);
  }

  return modulePath;
}
