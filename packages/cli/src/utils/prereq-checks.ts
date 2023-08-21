import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import {
  getTSConfigCompilerOptionsCanonical,
  type TSConfigCompilerOptions,
} from '@rehearsal/ts-utils';
import { compare } from 'compare-versions';
import { readJSONSync } from 'fs-extra/esm';
import { PackageJson } from 'type-fest';
import debug from 'debug';
import { findUpSync } from 'find-up';
import { tryLoadGlintConfig } from '@rehearsal/service';
import { findNearestESLintConfig, findNearestPackageJson, findNearestTSConfig } from './paths.js';
import type { PreReqTSConfig } from '../types.js';

const DEBUG_CALLBACK = debug('rehearsal:utils:prereqs');

export function isNodePreReq(requiredNode: string): boolean {
  const nodeVersion = process.version;
  // if the version of node is less than the requiredNode throw
  if (compare(nodeVersion, requiredNode, '<')) {
    throw new Error(
      `Please update your current node version "${nodeVersion}" to "${requiredNode}" or above and try again.`
    );
  }

  return true;
}

export function isTSConfigPreReq(srcPath: string, requiredTSConfig: PreReqTSConfig): boolean {
  if (!requiredTSConfig) {
    return true;
  }

  const message = `please update the tsconfig.json to meet requirements:\n${JSON.stringify(
    requiredTSConfig,
    null,
    2
  )}`;

  const { strict: strictRequired, skipLibCheck: skipLibCheckRequired } =
    requiredTSConfig.compilerOptions as TSConfigCompilerOptions;

  // only check for it if its required
  if (requiredTSConfig.glint) {
    isTSConfigGlintPreReq(srcPath, requiredTSConfig, message);
  }

  const tsConfigPath = findNearestTSConfig(srcPath)!;

  // this will fetch all the compilerOptions from tsconfig extends as well
  const { strict, skipLibCheck } = getTSConfigCompilerOptionsCanonical(tsConfigPath);

  if (strict === strictRequired && skipLibCheck === skipLibCheckRequired) {
    return true;
  } else {
    throw new Error(message);
  }
}

// should cover all eslint extensions
export function isESLintPreReq(srcPath: string, rootPath: string, requiredParser: string): boolean {
  const lintConfigPath = findNearestESLintConfig(srcPath, rootPath);
  if (!lintConfigPath) {
    throw new Error(
      `Eslint config (.eslintrc.{js,yml,json,yaml,cjs}) does not exist. Please add one and try again.`
    );
  }

  // read the lintConfigPath as text and check if it has the requiredParser string in it
  const lintConfigText = readFileSync(lintConfigPath, 'utf-8');

  if (!lintConfigText.includes(requiredParser)) {
    throw new Error(
      `Please update the parser to "${requiredParser}" in the ESLint config and try again.`
    );
  }

  return true;
}

function isTSConfigGlintPreReq(
  basePath: string,
  requiredTSConfigGlint: Pick<PreReqTSConfig, 'glint'>,
  message?: string
): void {
  const glint = tryLoadGlintConfig(basePath);
  const { glint: glintRequired } = requiredTSConfigGlint;

  if (!glint && glintRequired) {
    throw new Error(`"glint" key and options missing in tsconfig.json. ${message}`);
  }

  if (glint && glintRequired) {
    // check if the glint key has all the required keys
    const missingKeys = Object.keys(glintRequired).filter(
      (key) => !Object.keys(glint).includes(key)
    );
    if (missingKeys.length > 0) {
      throw new Error(
        `"glint" key is missing the following options in tsconfig.json: ${missingKeys.join(
          ', '
        )}. ${message}`
      );
    }

    // this is default true, so if its explicitly set to false throw
    if (glint.checkStandaloneTemplates === false) {
      throw new Error(
        `"glint.checkStandaloneTemplates" value is incorrect in tsconfig.json. ${message}`
      );
    }
  }
}

export function isExistsESLintConfig(srcPath: string, rootPath: string): boolean {
  const lintConfigPath = findNearestESLintConfig(srcPath, rootPath);
  if (!lintConfigPath) {
    throw new Error(`Eslint config (.eslintrc.{js,yml,json,yaml,cjs}) does not exist.`);
  }
  return true;
}

export function isExistsTSConfig(srcPath: string, rootPath: string): boolean {
  const tsConfigPath = findNearestTSConfig(srcPath, rootPath);
  if (!tsConfigPath) {
    throw new Error(
      `${tsConfigPath} does not exists. Please run rehearsal inside a project with a valid tsconfig.json.`
    );
  }
  return true;
}

export function isValidGitIgnore(rootPath: string): boolean {
  const gitignorePath = resolve(rootPath, '.gitignore');

  if (!existsSync(gitignorePath)) {
    return true;
  }

  const gitignore = readFileSync(gitignorePath, 'utf-8');
  const rehearsalReportRegex = /\rehearsal-report.*/g;
  if (rehearsalReportRegex.test(gitignore)) {
    throw new Error(
      `rehearsal-report is ignored by .gitignore file. Please remove it from .gitignore file and try again.`
    );
  }

  return true;
}

export function isDepsPreReq(
  srcPath: string,
  rootPath: string,
  requiredDeps: Record<string, string>
): boolean {
  // Read the package.json

  const nearestPackageJson = readJSONSync(findNearestPackageJson(srcPath)!) as PackageJson;
  const rootPackageJSON = readJSONSync(resolve(rootPath, 'package.json')) as PackageJson;

  const invalidVersion: string[] = [];
  const message: string[] = [];
  // Grab ALL nearest and root package.json dependencies and devDependencies as a single array with versions
  const packageJSONDeps = {
    ...rootPackageJSON.dependencies,
    ...rootPackageJSON.devDependencies,
    ...nearestPackageJson.dependencies,
    ...nearestPackageJson.devDependencies,
  } as Record<string, string>;

  // all the deps which are missing
  const missingDeps = Object.keys(requiredDeps).filter(
    (dep) => !Object.keys(packageJSONDeps).includes(extractDepName(dep))
  );

  DEBUG_CALLBACK('rootPath', rootPath);
  DEBUG_CALLBACK('srcPath', srcPath);
  DEBUG_CALLBACK('packageJSONDeps', packageJSONDeps);
  DEBUG_CALLBACK('missingDeps', missingDeps);

  // loop over the packageJSONDeps and compare the versions against the requiredDeps
  for (const dep in packageJSONDeps) {
    // if the dep is in the requiredDeps, but the versions do not match, throw an error
    if (Object.keys(requiredDeps).includes(dep)) {
      const installedVersion = packageJSONDeps[dep].replace(/[\^~]/g, '');
      const reqVersion = requiredDeps[dep].replace(/[\^~]/g, '');
      // support for "latest" version in installedVersion
      if (installedVersion === 'latest') {
        continue;
      }
      // if the installed dep is < the required dep, throw an error
      if (compare(installedVersion, reqVersion, '<')) {
        invalidVersion.push(dep);
      }
    }
  }

  // combine all the errors and throw them together for both missing and version mismatch
  if (invalidVersion.length > 0) {
    message.push(
      `Please update the following dependencies to the minimum required versions and try again:
      ${invalidVersion.map((dep) => `\n"${dep}": "^${requiredDeps[dep]}"`).join(', ')}`
    );

    // change the message to this format `"ts-node": "^10.9.1"`,
  }

  if (missingDeps.length > 0) {
    message.push(
      `Please install the following missing devDependencies and try again:
      ${missingDeps.map((dep) => `\n"${dep}": "^${requiredDeps[dep]}"`).join(', ')}`
    );
  }

  // throw the message if there are any errors
  if (message.length > 0) {
    throw new Error(message.join('\n'));
  }

  return true;
}

// get the name of dependency from those two format:
// - foo
// - foo@{version}
// Be aware that a package name would start with @, e.g @types/node
export function extractDepName(dep: string): string {
  const reg = /^(@?[^@]+)/g;
  const matched = dep.match(reg);
  return matched ? matched[0] : dep;
}

export function determineProjectName(directory = process.cwd()): string | null {
  const packageJSONPath = findUpSync('package.json', {
    cwd: directory,
  });

  if (!packageJSONPath) {
    return null;
  }
  const packageJSON = readJSONSync(packageJSONPath) as PackageJson;
  return packageJSON?.name ?? null;
}
