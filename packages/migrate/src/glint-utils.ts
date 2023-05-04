import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { GlintFixPlugin, GlintCommentPlugin, GlintReportPlugin } from '@rehearsal/plugins';
import type { PackageJson } from 'type-fest';
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
