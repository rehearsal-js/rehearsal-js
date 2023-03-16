import { resolve } from 'node:path';
import { existsSync, promises as fs } from 'node:fs';
import { ListrTask } from 'listr2';

import { addDep } from '@rehearsal/utils';
import { PackageJson } from 'type-fest';
import { MigrateCommandContext, MigrateCommandOptions } from '../../../types.js';

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

// get the name of dependency from those two format:
// - foo
// - foo@{version}
// Be aware that a package name would start with @, e.g @types/node
function extractDepName(dep: string): string {
  const reg = /^(@?[^@]+)/g;
  const matched = dep.match(reg);
  return matched ? matched[0] : dep;
}

// check if package.json has all required dependecies
// from rehearsal default and user config
export async function shouldRunDepInstallTask(
  options: MigrateCommandOptions,
  context: Partial<MigrateCommandContext> = {}
): Promise<boolean> {
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
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8')) as PackageJson;
    for (const d of dependencies) {
      if (!packageJson.dependencies || !packageJson.dependencies[extractDepName(d)]) {
        return true;
      }
    }

    for (const d of devDependencies) {
      if (!packageJson.devDependencies || !packageJson.devDependencies[extractDepName(d)]) {
        return true;
      }
    }
  } else {
    // no package.json
    return true;
  }
  return false;
}

export function depInstallTask(
  options: MigrateCommandOptions,
  context?: Partial<MigrateCommandContext>
): ListrTask {
  return {
    title: 'Install dependencies',
    enabled: (): boolean => !options.dryRun,
    skip: async (ctx: MigrateCommandContext): Promise<boolean> =>
      !(await shouldRunDepInstallTask(options, ctx)),
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

      const errorMessages: string[] = [];

      // for deps
      if (dependencies.length) {
        try {
          task.output = `Installing dependecies: ${dependencies.join(', ')}`;
          await addDep(dependencies, false, { cwd: options.basePath });
        } catch (e) {
          errorMessages.push(formatErrorMessage(dependencies, false));
        }
      }

      // for devDeps
      if (devDependencies.length) {
        try {
          task.output = `Installing devDependencies: ${devDependencies.join(', ')}`;
          await addDep(devDependencies, true, { cwd: options.basePath });
        } catch (e) {
          errorMessages.push(formatErrorMessage(devDependencies, true));
        }

        if (errorMessages.length) {
          throw new Error(errorMessages.join('\n'));
        }
      }
    },
    // will print and keep what dpe is currently installing at bottom bar
    options: { persistentOutput: true, bottomBar: Infinity },
  };
}

function formatErrorMessage(deps: string[], dev: boolean): string {
  const depType = dev ? 'devDependencies' : 'dependencies';
  return [
    `We ran into an error when installing ${depType}, please install the following as ${depType} and try again.`,
    `${deps.map((d) => `  - ${d}`).join('\n')}`,
  ].join('\n');
}
