import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readPackageJson } from '@rehearsal/migration-graph-shared';
import { requirePackageMain } from '@rehearsal/migration-graph-ember';
import resolvePackagePath from 'resolve-package-path';
import type { GlintFixPlugin, GlintCommentPlugin, GlintReportPlugin } from '@rehearsal/plugins';
import type { PackageJson, TsConfigJson } from 'type-fest';
import type { GlintService } from '@rehearsal/service';

type GlintFixPluginCtor = typeof GlintFixPlugin;
type GlintReportPluginCtor = typeof GlintReportPlugin;
type GlintCommentPluginCtor = typeof GlintCommentPlugin;

// The list of extensions that we expect to be handled by Glint{Fix,Check} plugins. Note that
// in any ember/glimmer project, we'll use the glint *service* for all files. This list is only
// indicating which extensions are handled by the plugins
export const GLINT_EXTENSIONS = ['.gts', '.hbs'];

// The list of dependencies we look for to determine if we're in a glint project. If we find one
// of these, we use glint. Otherwise, we use the regular Rehearsal service
export const GLINT_PROJECT_FILES = ['ember-source', '@glimmer/component', '@glimmerx/component'];

// Maps `moduleName` to actual package name for all ember addons that specify a `moduleName` in
// their `ember-addon.main` file
export function createEmberAddonModuleNameMap(basePath: string): Record<string, string> {
  const pkg = readPackageJson(basePath);
  const depNames = Object.keys(pkg.dependencies ?? {});

  return depNames.reduce<Record<string, string>>((acc, name) => {
    const pkgJsonPath = resolvePackagePath(name, basePath);
    if (pkgJsonPath === null) {
      throw new Error(`Could not resolve path for ${name}`);
    }
    const modulePath = path.dirname(pkgJsonPath);
    const pkg = readPackageJson(modulePath);

    if (!(pkg.keywords && pkg.keywords.includes('ember-addon'))) {
      return acc;
    }

    const addon = requirePackageMain(modulePath);
    const moduleName = addon.moduleName ? addon.moduleName() : name;

    acc[name] = moduleName;

    return acc;
  }, {});
}

// This function updates tsconfig.compilerOptions.paths with mappings from any ember addons that
// specify a `moduleName` to their actual real location in `node_modules` so that TS can actually
// resolve the types.
export async function addFilePathsForAddonModules(
  configFilepath: string,
  tsConfig: TsConfigJson,
  moduleNameMap: Record<string, string>
): Promise<void> {
  const newPaths = {};

  for (const [real, fake] of Object.entries(moduleNameMap)) {
    if (real === fake) {
      continue;
    }

    Object.assign(newPaths, {
      [fake]: [`node_modules/${real}`],
      [`${fake}/*`]: [`node_modules/${real}/*`],
    });
  }

  if (Object.keys(newPaths).length > 0) {
    tsConfig.compilerOptions ??= {};
    tsConfig.compilerOptions.paths ??= {};
    Object.assign(tsConfig.compilerOptions.paths, newPaths);
    await writeFile(configFilepath, JSON.stringify(tsConfig, null, 2));
  }
}

export async function shouldUseGlint(basePath: string): Promise<boolean> {
  const pkgPath = path.resolve(basePath, 'package.json');
  let pkgJson: string;

  try {
    pkgJson = await readFile(pkgPath, 'utf-8');
  } catch (err) {
    throw new Error(`There was an issue reading the package.json file located at ${pkgPath}`);
  }

  const pkg = JSON.parse(pkgJson) as PackageJson;
  const deps = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];

  return deps.some((pkgName) => {
    return GLINT_PROJECT_FILES.includes(pkgName);
  });
}

// All of these functions exist to handle the fact that @glint/core won't be present as a peer dep
// for non-Ember projects, so we need to lazily import and instantiate anything that depends on it
// or else we get "module not found" errors
export async function createGlintService(basePath: string): Promise<GlintService> {
  const glintCore = await import('@glint/core');
  const GlintService = (await import('@rehearsal/service')).GlintService;

  return new GlintService(glintCore, basePath);
}

export async function getGlintFixPlugin(): Promise<GlintFixPluginCtor> {
  const GlintFixPlugin = (await import('@rehearsal/plugins')).GlintFixPlugin;

  return GlintFixPlugin;
}

export async function getGlintReportPlugin(): Promise<GlintReportPluginCtor> {
  const GlintReportPlugin = (await import('@rehearsal/plugins')).GlintReportPlugin;

  return GlintReportPlugin;
}

export async function getGlintCommentPlugin(): Promise<GlintCommentPluginCtor> {
  const GlintCommentPlugin = (await import('@rehearsal/plugins')).GlintCommentPlugin;

  return GlintCommentPlugin;
}
