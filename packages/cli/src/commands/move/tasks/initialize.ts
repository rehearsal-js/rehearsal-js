import { existsSync } from 'node:fs';
import { isAbsolute, relative, resolve, extname } from 'node:path';
import { ListrTask, ListrDefaultRenderer } from 'listr2';
import debug from 'debug';
// eslint-disable-next-line import/no-extraneous-dependencies
import fastGlob from 'fast-glob';
import { findWorkspaceRoot, determineProjectName } from '@rehearsal/utils';

import type { MoveCommandContext, MoveCommandOptions } from '../../../types.js';

const DEBUG_CALLBACK = debug('rehearsal:move:initialize');

// everything is relative to the project root. options.basePath cannot be configured by the user
export function initTask(
  options: MoveCommandOptions
): ListrTask<MoveCommandContext, ListrDefaultRenderer> {
  return {
    title: `Initialize`,
    task: (ctx: MoveCommandContext): void => {
      // ! this is always the same as basePath why do we need this?
      ctx.workspaceRoot = getWorkspaceRoot(options.basePath);

      // source file or dir should always exist within the basePath
      if (options.source) {
        [ctx.jsSourcesAbs, ctx.jsSourcesRel] = validateSourcePath(options.basePath, options.source);
      }

      if (options.childPackage) {
        [ctx.childPackageAbs, ctx.childPackageRel] = validateChildPackage(
          options.basePath,
          options.childPackage
        );
      }

      ctx.projectName = determineProjectName(options.basePath);

      DEBUG_CALLBACK('init ctx %O:', ctx);
    },
  };
}

// force in project root
function getWorkspaceRoot(basePath: string): string {
  const workspaceRoot = findWorkspaceRoot(basePath);
  if (basePath !== workspaceRoot) {
    throw new Error(
      `Rehearsal needs to be running at project root with workspaces. Seems like the project root should be ${workspaceRoot} instead of current directory ${basePath}.`
    );
  }

  return workspaceRoot;
}

// be sure the source exists within the basePath project
function validateSourcePath(basePath: string, source: string): [string[], string[]] {
  const relativePath = relative(basePath, resolve(basePath, source));

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
    // validate that the source is a js | .gjs file
    if (extname(source) === '.js' || extname(source) === '.gjs') {
      return [[resolve(basePath, source)], [relativePath]];
    }

    throw new Error(`Rehearsal will only move .js or .gjs files. Source: ${source} is neither.`);
  }

  // otherwise return all the js files in the directory and its subdirectories
  return getAllJSFilesInDir(basePath, source);
}

// check if the source is a directory
function isDirectory(source: string): boolean {
  return extname(source) === '';
}

function getAllJSFilesInDir(basePath: string, source: string): [string[], string[]] {
  const sourceAbs = resolve(basePath, source);
  const sourceRel = relative(basePath, sourceAbs);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
  const sourceFiles = fastGlob.sync(`${sourceRel}/**/*.{js,gjs}`, { cwd: basePath });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
  return [sourceFiles.map((file) => resolve(basePath, file)), sourceFiles];
}

// be sure the childPackage exists within the basePath project and returns rel and abs tuple
function validateChildPackage(basePath: string, childPackage: string): [string, string] {
  if (
    !existsSync(resolve(basePath, childPackage)) ||
    !existsSync(resolve(basePath, childPackage, 'package.json'))
  ) {
    throw new Error(
      `Rehearsal could not find the childPackage: ${childPackage} in project: ${basePath}`
    );
  }

  // return the abs path and rel path of the childPackage
  return [resolve(basePath, childPackage), relative(basePath, resolve(basePath, childPackage))];
}
