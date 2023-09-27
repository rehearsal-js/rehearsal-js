import { ListrDefaultRenderer, ListrTask } from 'listr2';
import debug from 'debug';
import { isGlintProject, isEmberAddon, isEmberApp } from '@rehearsal/service';
import { readJsonSync } from 'fs-extra/esm';
import { PackageJson } from 'type-fest';
import { getPreReqs } from '../../../prereqs.js';
import { findNearestPackageJson, validateSourcePath } from '../../../utils/paths.js';

import {
  determineProjectName,
  isDepsPreReq,
  isESLintPreReq,
  isExistsESLintConfig,
  isExistsTSConfig,
  isNodePreReq,
  isTSConfigPreReq,
  isValidGitIgnore,
} from '../../../utils/prereq-checks.js';
import type { FixCommandOptions, CommandContext, ProjectType, SkipChecks } from '../../../types.js';

const DEBUG_CALLBACK = debug('rehearsal:cli:fix:init-task');

// everything is relative to the project root. options.basePath cannot be configured by the user
export function initTask(
  srcPath: string,
  options: FixCommandOptions,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ctx?: CommandContext
): ListrTask<CommandContext, ListrDefaultRenderer> {
  return {
    title: `Initialize`,
    task: (ctx: CommandContext): void => {
      const { rootPath, skipChecks } = options;

      let projectType: ProjectType = 'base-ts';

      const foundPackageJson = findNearestPackageJson(srcPath);

      if (!foundPackageJson) {
        throw new Error(
          `Can't find package.json for '${srcPath}'. Please run rehearsal inside a project with a valid package.json.`
        );
      }

      const packageJSON = readJsonSync(foundPackageJson) as PackageJson;

      if (isEmberApp(packageJSON) || isEmberAddon(packageJSON)) {
        projectType = 'ember';
      } else if (isGlintProject(srcPath)) {
        projectType = 'glimmer';
      }

      // Each of sub-tasks of the next function will throw on failure
      preFlightCheck(srcPath, rootPath, projectType, skipChecks);

      ctx.projectName = determineProjectName(rootPath) || '';

      // in this mode we skip the `graphOrderTask`
      if (process.env['GRAPH_MODES'] === 'off') {
        // grab all the ts files since we don't have graph output
        [ctx.orderedFiles] = validateSourcePath(rootPath, srcPath, 'ts');
      }

      DEBUG_CALLBACK('ctx %O:', ctx);
    },
    options: {
      bottomBar: false,
      persistentOutput: false,
    },
  };
}

export function preFlightCheck(
  srcPath: string,
  rootPath: string,
  projectType: ProjectType,
  skipChecks: SkipChecks = [],
  isSkipped = false
): void {
  // FOR LOCAL DEVELOPMENT TESTING ONLY! SKIP ALL PRE-REQ CHECKS
  if (isSkipped) {
    return;
  }

  const { deps, eslint, tsconfig, node } = getPreReqs(projectType);

  // "isExists" checks these will throw faster than the prereq checks
  isExistsTSConfig(srcPath, rootPath);
  isExistsESLintConfig(srcPath, rootPath);
  isValidGitIgnore(rootPath);
  if (!skipChecks.includes('deps')) {
    isDepsPreReq(srcPath, rootPath, deps);
  }
  if (!skipChecks.includes('eslint')) {
    isESLintPreReq(srcPath, rootPath, eslint);
  }
  isTSConfigPreReq(srcPath, tsconfig);
  isNodePreReq(node);
}
