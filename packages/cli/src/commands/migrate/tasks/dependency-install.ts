import { resolve } from 'node:path';
import { existsSync, promises as fs } from 'node:fs';
import { ListrTask } from 'listr2';

import { addDep, setModuleResolution, getModuleVersion } from '@rehearsal/utils';
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

// check if package.json has all required dependencies
// from rehearsal default and user config
// return which deps to install and if we should install
export async function shouldRunDepInstallTask(
  options: MigrateCommandOptions,
  context: Partial<MigrateCommandContext> = {}
): Promise<{
  dependencies: string[];
  devDependencies: string[];
  isInstallRequired: boolean;
}> {
  const { basePath } = options;
  const packageJsonPath = resolve(basePath, 'package.json');
  // these will be the deps and devDeps we need to install after filtering
  let dependencies: string[] = [];
  let devDependencies = REQUIRED_DEPENDENCIES;
  // grab the userConfig dependencies and devDependencies
  const userConfigDeps = context.userConfig?.dependencies || [];
  const userConfigDevDeps = context.userConfig?.devDependencies || [];

  // filter out duplicates
  dependencies = [...new Set([...dependencies, ...userConfigDeps])];
  devDependencies = [...new Set([...devDependencies, ...userConfigDevDeps])];

  // no package.json always install
  if (!existsSync(packageJsonPath)) {
    return {
      dependencies,
      devDependencies,
      isInstallRequired: true,
    };
  }

  // parse package.json since it exists
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8')) as PackageJson;

  // grab ALL packageJson dependencies and devDependencies as a single array
  const packageJSONDeps = Object.keys({
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  });

  // filter out from dependencies and devDependencies from those that are already installed in the migrating app
  dependencies = dependencies.filter((dep) => !packageJSONDeps.includes(extractDepName(dep)));
  devDependencies = devDependencies.filter((dep) => !packageJSONDeps.includes(extractDepName(dep)));

  // if dependencies OR devDependencies are truthy then we need to install and return true
  return {
    dependencies,
    devDependencies,
    isInstallRequired: dependencies.length > 0 || devDependencies.length > 0,
  };
}

export function depInstallTask(
  options: MigrateCommandOptions,
  context?: Partial<MigrateCommandContext>
): ListrTask {
  return {
    title: 'Install dependencies',
    enabled: (): boolean => !options.dryRun,
    skip: async (ctx: MigrateCommandContext): Promise<boolean> => {
      const { isInstallRequired } = await shouldRunDepInstallTask(options, ctx);
      return !isInstallRequired;
    },
    task: async (ctx: MigrateCommandContext, task): Promise<void> => {
      // If context is provide via external parameter, merge with existed
      if (context) {
        ctx = { ...ctx, ...context };
      }

      const { dependencies, devDependencies } = await shouldRunDepInstallTask(options, ctx);

      // install userConfig postInstall hook
      if (ctx.userConfig?.hasDependencies) {
        if (ctx.userConfig?.hasPostInstallHook) {
          task.output = `Run postInstall hook from config`;
          await ctx.userConfig.postInstall();
        }
      }

      const errorMessages: string[] = [];

      // for deps
      if (dependencies.length) {
        try {
          task.output = `Installing dependencies: ${dependencies.join(', ')}`;
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

      // set module resolution for typescript after dep install
      try {
        const tsVersion = await getModuleVersion('typescript', 'devDep', options.basePath);
        // if the tsVersion being return is an empty string or falsy
        if (!tsVersion) {
          throw new Error(`cannot set resolution for typescript`);
        }

        task.output = `Setting resolutions: typescript@${tsVersion}`;
        await setModuleResolution('typescript', tsVersion, options.basePath);
      } catch (e) {
        throw new Error(`${e}`);
      }
    },
    // will print and keep what dpe is currently installing at bottom bar
    options: { persistentOutput: false, bottomBar: Infinity },
  };
}

function formatErrorMessage(deps: string[], dev: boolean): string {
  const depType = dev ? 'devDependencies' : 'dependencies';
  return [
    `We ran into an error when installing ${depType}, please install the following as ${depType} and try again.`,
    `${deps.map((d) => `  - ${d}`).join('\n')}`,
  ].join('\n');
}
