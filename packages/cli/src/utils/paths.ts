import { existsSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import fastGlob from 'fast-glob';
import {
  SUPPORTED_JS_EXTENSIONS,
  SUPPORTED_TS_EXTENSIONS,
  getExcludePatterns,
} from '@rehearsal/migration-graph';
import { findUpSync } from 'find-up';
import { getManagerBinPath, getModuleManager } from '@rehearsal/utils';
import { Options, execa } from 'execa';

export function validateSourcePath(
  basePath: string,
  source: string,
  fileType: 'ts' | 'js',
  ignorePatterns: string[] = []
): [string[], string[]] {
  const relativePath = relative(basePath, resolve(basePath, source));
  const groupedExt = (
    fileType === 'js' ? SUPPORTED_JS_EXTENSIONS : SUPPORTED_TS_EXTENSIONS
  ) as ReadonlyArray<string>;

  if (
    source &&
    (!relativePath ||
      relativePath.startsWith('..') ||
      isAbsolute(relativePath) ||
      !existsSync(resolve(basePath, relativePath)))
  ) {
    throw new Error(`Rehearsal could not find source: ${source} in project: ${basePath}`);
  }

  // if source is a directory, get all the files otherwise just return the source as abs and rel tuple
  if (!isDirectory(source)) {
    if (groupedExt.includes(extname(source))) {
      return [[resolve(basePath, source)], [relativePath]];
    }

    throw new Error(`Rehearsal will only move ${groupedExt} files. Source: ${source} is neither.`);
  }

  // otherwise return all the js files in the directory and its subdirectories
  return getFilesByType(basePath, source, fileType, ignorePatterns);
}

// TODO this is just wrong
export function isDirectory(source: string): boolean {
  return extname(source) === '';
}

/**
 * Get files by requested type returns tuple with [abs, rel] paths
 * @typedef {(ts|js)} FileType
 * @param {string} basePath - eg process.cwd()
 * @param {string} source - eg basePath/src or basePath/src/child/file.ts|.js
 * @param {FileType} fileType - either ts | js, which will glob for 'js,gjs'|'ts,gts'
 */
export function getFilesByType(
  basePath: string,
  source: string,
  fileType: 'ts' | 'js',
  ignorePatterns: string[] = []
): [string[], string[]] {
  const sourceAbs = resolve(basePath, source);
  const sourceRel = relative(basePath, sourceAbs);
  const globPaths =
    fileType === 'js'
      ? SUPPORTED_JS_EXTENSIONS.map((ext) => ext.replace('.', '')).join(',')
      : SUPPORTED_TS_EXTENSIONS.map((ext) => ext.replace('.', '')).join(',');

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
  const sourceFiles = fastGlob.sync(`${sourceRel}/**/*.{${globPaths}}`, {
    cwd: basePath,
    ignore: [...ignorePatterns, ...getExcludePatterns()],
  });

  // if no files are found, throw an error
  if (!sourceFiles.length) {
    throw new Error(
      `Rehearsal could not find any ${fileType} files in the source directory: ${sourceAbs}`
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
  return [sourceFiles.map((file) => resolve(basePath, file)), sourceFiles];
}

/**
 * Finds the closest ancestor to `startPath` directory containing package.json file
 */
export function findPackageRootDirectory(startPath: string, stopPath?: string): string | undefined {
  const foundPackageJson = findNearestPackageJson(startPath, stopPath);

  return foundPackageJson ? dirname(foundPackageJson) : undefined;
}

export function findNearestPackageJson(startPath: string, stopPath?: string): string | undefined {
  const foundPackageJson = findUpSync('package.json', {
    cwd: startPath,
    stopAt: stopPath,
  });

  return foundPackageJson;
}

// rather than explicitly setting from node_modules dir we need to handle workspaces use case
// and volta use case
export async function getPathToBinary(binaryName: string, options: Options = {}): Promise<string> {
  // pnpm | yarn | npm
  const moduleManager = getModuleManager();
  // /Users/foo/.volta/bin/yarn
  // /usr/local/bin/pnpm
  const moduleManagerBin = getManagerBinPath(moduleManager);

  let binaryDir;

  // Get the binary dir
  // pnpm, yarn and npm@<9 support "bin", while npm@>=9 drops bin
  // it is still the best to try bin first
  // then fallback to get the executable bin directly from node_modules/.bin/
  try {
    const { stdout } = await execa(moduleManagerBin, ['bin', binaryName], options);
    binaryDir = stdout.trim().split(`/${binaryName}`)[0];
  } catch (e) {
    // Now <package manager> bin failed
    // try to get the executable bin directly from node_modules/.bin/
    const binPath = resolve(
      `${options.cwd ? options.cwd : process.cwd()}`,
      'node_modules',
      '.bin',
      binaryName
    );
    if (!existsSync(binPath)) {
      // Now both methods failed, throw error
      throw new Error(`Unable to find binary path to ${binaryName}`);
    }
    binaryDir = binPath.trim().split(`/${binaryName}`)[0];
  }

  // Then return the path to the binary
  try {
    return resolve(join(binaryDir, binaryName));
  } catch (error) {
    throw new Error(`Unable to find ${binaryName} with ${moduleManagerBin}`);
  }
}
