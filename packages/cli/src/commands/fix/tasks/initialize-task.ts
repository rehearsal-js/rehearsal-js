import { resolve } from 'node:path';
import { ListrDefaultRenderer, ListrTask } from 'listr2';
import debug from 'debug';
import {
  validateSourcePath,
  validatePackagePath,
  isExistsPackageJSON,
  isExistsESLintConfig,
  isExistsTSConfig,
  isValidGitIgnore,
  isDepsPreReq,
  isESLintPreReq,
  isTSConfigPreReq,
  isNodePreReq,
  determineProjectName,
} from '@rehearsal/utils';
// eslint-disable-next-line no-restricted-imports
import { isGlintProject } from '@rehearsal/service';
import { readJsonSync } from 'fs-extra/esm';
// eslint-disable-next-line no-restricted-imports
import { isEmberAddon, isEmberApp } from '@rehearsal/migration-graph-ember';
import { PackageJson } from 'type-fest';
import { getPreReqs } from '../../../prereqs.js';

import type { FixCommandOptions, CommandContext, ProjectType } from '../../../types.js';

const DEBUG_CALLBACK = debug('rehearsal:cli:fix:init-task');

// everything is relative to the project root. options.basePath cannot be configured by the user
export function initTask(
  src: string,
  options: FixCommandOptions,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ctx?: CommandContext
): ListrTask<CommandContext, ListrDefaultRenderer> {
  return {
    title: `Initialize`,
    task: async (ctx: CommandContext): Promise<void> => {
      const { rootPath, graph } = options;

      ctx.packageJSON = readJsonSync(resolve(rootPath, 'package.json')) as PackageJson;
      ctx.projectType = 'base-ts';
      ctx.projectName = determineProjectName(rootPath) || '';

      // if ember app or addon
      if (isEmberApp(ctx.packageJSON) || isEmberAddon(ctx.packageJSON)) {
        ctx.projectType = 'ember';
      } else if (await isGlintProject(rootPath)) {
        ctx.projectType = 'glimmer';
      }

      // if a package is specified grab all the ts files in the package
      // expectation is rehearsal move has already been run on the package
      // expect a tsconfig.json file in rootPath
      if (graph) {
        [ctx.packageAbs, ctx.packageRel] = validatePackagePath(rootPath, src);
        // expect a tsconfig.json file in the root of the child package
        preFlightCheck(rootPath, ctx.projectType);
      } else {
        // grab all the ts files in the project
        // expectation is rehearsal move has already been run on the source
        // expect a tsconfig.json file in rootPath
        preFlightCheck(rootPath, ctx.projectType);

        [ctx.sourceFilesAbs, ctx.sourceFilesRel] = validateSourcePath(rootPath, src, 'ts');
      }

      DEBUG_CALLBACK('ctx %O:', ctx);
    },
    options: {
      bottomBar: false,
      persistentOutput: false,
    },
  };
}

// each of these sub-tasks will throw on failure
export function preFlightCheck(
  basePath: string,
  projectType: ProjectType,
  isSkipped = false
): void {
  // FOR LOCAL DEVELOPMENT TESTING ONLY! SKIP ALL PRE-REQ CHECKS
  if (isSkipped) {
    return;
  }

  const { deps, eslint, tsconfig, node } = getPreReqs(projectType);

  // is exists checks these will throw faster than the prereq checks
  isExistsPackageJSON(basePath);
  isExistsTSConfig(basePath);
  isExistsESLintConfig(basePath);
  isValidGitIgnore(basePath);
  // prereq checks for both the version and the package
  isDepsPreReq(basePath, deps);
  isESLintPreReq(basePath, eslint);
  isTSConfigPreReq(basePath, tsconfig);
  isNodePreReq(node);
}
