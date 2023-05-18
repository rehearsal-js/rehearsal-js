import { join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { TSConfig, readTSConfig } from '@rehearsal/utils';
import fastGlob from 'fast-glob';
import {
  getTSConfigCompilerOptionsCanonical,
  type TSConfigCompilerOptions,
} from '@rehearsal/ts-utils';
import { compare } from 'compare-versions';
import { readJSONSync } from 'fs-extra/esm';
import { PackageJson } from 'type-fest';
import debug from 'debug';
import { findUpSync } from 'find-up';
import { PreReqTSConfig } from '../types.js';

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

export function isTSConfigPreReq(basePath: string, requiredTSConfig: PreReqTSConfig): boolean {
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
  const tsConfigPath = resolve(basePath, 'tsconfig.json');

  // only check for it if its required
  if (requiredTSConfig.glint) {
    isTSConfigGlintPreReq(tsConfigPath, requiredTSConfig, message);
  }
  // this will fetch all the compilerOptions from tsconfig extends as well
  const { strict, skipLibCheck } = getTSConfigCompilerOptionsCanonical(basePath, tsConfigPath);

  if (strict === strictRequired && skipLibCheck === skipLibCheckRequired) {
    return true;
  } else {
    throw new Error(message);
  }
}

// should cover all eslint extensions
export function isESLintPreReq(basePath: string, requiredParser: string): boolean {
  const lintConfigPath = getEsLintConfigPath(basePath);
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

export function getEsLintConfigPath(basePath: string): string {
  // glob against the following file extension patterns and return the first match
  const configPath = fastGlob.sync(join(basePath, '.eslintrc?(.{js,yml,json,yaml,cjs})'))[0];
  return configPath;
}

function isTSConfigGlintPreReq(
  tsConfigPath: string,
  requiredTSConfigGlint: Pick<PreReqTSConfig, 'glint'>,
  message?: string
): void {
  // the glint key isn't supported by with ts API so we have to grab it manually
  const { glint } = readTSConfig<TSConfig>(tsConfigPath);
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

export function isExistsESLintConfig(basePath: string): boolean {
  const lintConfigPath = getEsLintConfigPath(basePath);
  if (!lintConfigPath) {
    throw new Error(`Eslint config (.eslintrc.{js,yml,json,yaml,cjs}) does not exist.`);
  }
  return true;
}

export function isExistsPackageJSON(basePath: string): boolean {
  const packageJsonPath = resolve(basePath, 'package.json');
  if (!existsSync(packageJsonPath)) {
    throw new Error(
      `${packageJsonPath} does not exists. Please run rehearsal inside a project with a valid package.json.`
    );
  }
  return true;
}

export function isExistsTSConfig(basePath: string): boolean {
  const tsConfigPath = resolve(basePath, 'tsconfig.json');
  if (!existsSync(tsConfigPath)) {
    throw new Error(
      `${tsConfigPath} does not exists. Please run rehearsal inside a project with a valid tsconfig.json.`
    );
  }
  return true;
}

export function isValidGitIgnore(basePath: string): boolean {
  const gitignorePath = resolve(basePath, '.gitignore');
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

export function isDepsPreReq(basePath: string, requiredDeps: Record<string, string>): boolean {
  // read the package.json
  const packageJSON = readJSONSync(resolve(basePath, 'package.json')) as PackageJson;
  const invalidVersion: string[] = [];
  const message: string[] = [];
  // grab ALL packageJson dependencies and devDependencies as a single array with versions
  const packageJSONDeps = {
    ...packageJSON.dependencies,
    ...packageJSON.devDependencies,
  } as Record<string, string>;

  // all the deps which are missing
  const missingDeps = Object.keys(requiredDeps).filter(
    (dep) => !Object.keys(packageJSONDeps).includes(extractDepName(dep))
  );

  DEBUG_CALLBACK('basePath', basePath);
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
