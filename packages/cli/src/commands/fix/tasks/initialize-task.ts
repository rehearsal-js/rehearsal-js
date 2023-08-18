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
  isExistsPackageJSON,
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

      isExistsPackageJSON(srcPath);

      const foundPackageJson = findNearestPackageJson(srcPath)!;
      const packageJSON = readJsonSync(foundPackageJson) as PackageJson;

      if (isEmberApp(packageJSON) || isEmberAddon(packageJSON)) {
        projectType = 'ember';
      } else if (isGlintProject(srcPath)) {
        projectType = 'glimmer';
      }

      preFlightCheck(rootPath, srcPath, projectType, skipChecks);

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

// each of these sub-tasks will throw on failure
export function preFlightCheck(
  rootPath: string,
  srcPath: string,
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
  isExistsTSConfig(srcPath);
  isExistsESLintConfig(rootPath);
  isValidGitIgnore(rootPath);
  // prereq checks for both the version and the package
  if (!skipChecks.includes('deps')) {
    isDepsPreReq(rootPath, deps);
  }
  if (!skipChecks.includes('eslint')) {
    isESLintPreReq(rootPath, eslint);
  }
  isTSConfigPreReq(srcPath, tsconfig);
  isNodePreReq(node);
}
