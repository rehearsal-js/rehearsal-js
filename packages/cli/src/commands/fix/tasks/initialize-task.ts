import { resolve } from 'node:path';
import { ListrDefaultRenderer, ListrTask } from 'listr2';
import debug from 'debug';
import {
  validateSourcePath,
  validateChildPackage,
  isExistsPackageJSON,
  isExistsESLintConfig,
  isExistsTSConfig,
  isValidGitIgnore,
  isDepsPreReq,
  isESLintPreReq,
  isTSConfigPreReq,
  isNodePreReq,
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
  options: FixCommandOptions,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ctx?: CommandContext
): ListrTask<CommandContext, ListrDefaultRenderer> {
  return {
    title: `Initialize`,
    task: async (ctx: CommandContext): Promise<void> => {
      const { basePath, source, childPackage } = options;
      ctx.packageJSON = readJsonSync(resolve(basePath, 'package.json')) as PackageJson;

      // check if ember app/addon or glimmer project
      ctx.projectType = 'base';
      // if ember app or addon
      if (isEmberApp(ctx.packageJSON) || isEmberAddon(ctx.packageJSON)) {
        ctx.projectType = 'ember';
      } else if (await isGlintProject(basePath)) {
        ctx.projectType = 'glimmer';
      }

      // source flag - grab all the ts files in the project - expectation is rehearsal move has already been run on the source
      if (source) {
        // expect a tsconfig.json file in basePath
        preFlightCheck(basePath, ctx.projectType);

        [ctx.sourceFilesAbs, ctx.sourceFilesRel] = validateSourcePath(basePath, source, 'ts');
      }

      // childPackage flag - if a child package is specified grab all the ts files in the child package - expectation is rehearsal move has already been run on the child package
      // sourceFilesAbs, sourceFilesRel will be set in the graph task as we need proper order
      if (childPackage) {
        [ctx.childPackageAbs, ctx.childPackageRel] = validateChildPackage(basePath, childPackage);
        // expect a tsconfig.json file in the root of the child package
        preFlightCheck(ctx.childPackageAbs, ctx.projectType);
      }

      DEBUG_CALLBACK('ctx %O:', ctx);
    },
    options: {
      // options for dryRun, since we need to keep the output to see the list of files
      bottomBar: options.dryRun ? true : false,
      persistentOutput: options.dryRun ? true : false,
    },
  };
}

// each of these sub-tasks will throw on failure
export function preFlightCheck(basePath: string, projectType: ProjectType): void {
  const { deps, eslint, tsconfig, node } = getPreReqs(projectType);

  // is exists checks these will throw faster than the prereq checks
  isExistsPackageJSON(basePath);
  isExistsTSConfig(basePath);
  isExistsESLintConfig(basePath);
  isValidGitIgnore(basePath);
  // prereq checks for both the version and the package
  isDepsPreReq(basePath, deps);
  isESLintPreReq(basePath, eslint.parser);
  isTSConfigPreReq(basePath, tsconfig);
  isNodePreReq(node);
}
