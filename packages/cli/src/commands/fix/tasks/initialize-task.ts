import { resolve } from 'node:path';
import { ListrDefaultRenderer, ListrTask } from 'listr2';
import debug from 'debug';
import { isGlintProject, isAddon, isApp } from '@rehearsal/service';
import { readJsonSync } from 'fs-extra/esm';
import { PackageJson } from 'type-fest';
import { getPreReqs } from '../../../prereqs.js';
import { validateSourcePath } from '../../../utils/paths.js';

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
    task: async (ctx: CommandContext): Promise<void> => {
      const { rootPath, skipDepsCheck, skipEsLintCheck } = options;

      const skipChecks = {
        skipDepsCheck,
        skipEsLintCheck,
      };

      let projectType: ProjectType = 'base-ts';
      const packageJSON = readJsonSync(resolve(rootPath, 'package.json')) as PackageJson;
      ctx.projectName = determineProjectName(rootPath) || '';

      // if ember app or addon
      if (isApp(packageJSON) || isAddon(packageJSON)) {
        projectType = 'ember';
      } else if (await isGlintProject(rootPath)) {
        projectType = 'glimmer';
      }

      preFlightCheck(rootPath, projectType, skipChecks);

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
  basePath: string,
  projectType: ProjectType,
  skipChecks: SkipChecks,
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
  // if `--skipDepsCheck` flag is true skip `isDepsPreReq`
  if (!skipChecks.skipDepsCheck) {
    isDepsPreReq(basePath, deps);
  }
  // if `--skipEsLintCheck` flag is true skip `isEslintPreReq`
  if (!skipChecks.skipEsLintCheck) {
    isESLintPreReq(basePath, eslint);
  }
  isTSConfigPreReq(basePath, tsconfig);
  isNodePreReq(node);
}
