import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { ListrTask } from 'listr2';
import { readJSONSync } from 'fs-extra/esm';

import { addDep } from '@rehearsal/utils';
import type { MigrateCommandContext, MigrateCommandOptions } from '../../../types.js';

export const REQUIRED_DEPENDENCIES = [
  '@types/node',
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/parser',
  'eslint',
  'eslint-config-prettier',
  'eslint-plugin-prettier',
  'prettier',
  'typescript',
];

// check if package.json has all required dependecies
// from rehearsal default and user config
export function shouldRunDepInstallTask(
  options: MigrateCommandOptions,
  context: Partial<MigrateCommandContext> = {}
): boolean {
  const { basePath } = options;
  // add extra required dependencies from user config if there is any
  let dependencies: string[] = [];
  let devDependencies = REQUIRED_DEPENDENCIES;
  if (context.userConfig?.hasDependencies) {
    // check if package.json has all the dependencies listed in user config
    dependencies = [...dependencies, ...context.userConfig.dependencies];
    devDependencies = [...devDependencies, ...context.userConfig.devDependencies];
  }

  const packageJsonPath = resolve(basePath, 'package.json');
  if (existsSync(packageJsonPath)) {
    const packageJson = readJSONSync(packageJsonPath);
    for (const d of dependencies) {
      if (!packageJson.dependencies || !packageJson.dependencies[d]) {
        return true;
      }
    }

    for (const d of devDependencies) {
      if (!packageJson.devDependencies || !packageJson.devDependencies[d]) {
        return true;
      }
    }
  } else {
    // no package.json
    return true;
  }
  return false;
}

export async function depInstallTask(
  options: MigrateCommandOptions,
  context?: Partial<MigrateCommandContext>
): Promise<ListrTask> {
  return {
    title: 'Install dependencies',
    enabled: (): boolean => !options.dryRun,
    skip: (ctx: MigrateCommandContext): boolean => !shouldRunDepInstallTask(options, ctx),
    task: async (ctx: MigrateCommandContext, task): Promise<void> => {
      // If context is provide via external parameter, merge with existed
      if (context) {
        ctx = { ...ctx, ...context };
      }

      let dependencies: string[] = [];
      let devDependencies = REQUIRED_DEPENDENCIES;
      // install custom dependencies
      if (ctx.userConfig?.hasDependencies) {
        task.output = `Install dependencies from config`;
        dependencies = [...dependencies, ...ctx.userConfig.dependencies];
        devDependencies = [...devDependencies, ...ctx.userConfig.devDependencies];
        if (ctx.userConfig?.hasPostInstallHook) {
          task.output = `Run postInstall hook from config`;
          await ctx.userConfig.postInstall();
        }
      }

      // hold failed deps
      const failedDeps: string[] = [];
      const failedDevDeps: string[] = [];

      for (const dep of dependencies) {
        try {
          task.output = `Installing dependency ${dep}...`;
          await addDep([dep], false, { cwd: options.basePath });
        } catch (e) {
          failedDeps.push(dep);
        }
      }

      for (const dep of devDependencies) {
        try {
          task.output = `Installing devDependency ${dep}...`;
          await addDep([dep], true, { cwd: options.basePath });
        } catch (e) {
          failedDevDeps.push(dep);
        }
      }

      const depErrorMessage = failedDeps.length
        ? `Could not install the following packages as dependencies:\n${failedDeps.join(
            '\n'
          )}\nPlease try again or install manually as dependencies in your project.`
        : '';

      const devDepErrorMessage = failedDevDeps.length
        ? `Could not install the following packages as devDependencies:\n${failedDevDeps.join(
            '\n'
          )}\nPlease try again or install manually as devDependencies in your project.`
        : '';

      if (failedDeps.length || failedDevDeps.length) {
        throw new Error(`${depErrorMessage}\n${devDepErrorMessage}`);
      }
    },
    // will print and keep what dpe is currently installing at bottom bar
    options: { persistentOutput: true, bottomBar: Infinity },
  };
}
