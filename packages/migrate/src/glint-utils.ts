import type { GlintFixPlugin, GlintCommentPlugin, GlintReportPlugin } from '@rehearsal/plugins';
import type { GlintService } from '@rehearsal/service';

type GlintFixPluginCtor = typeof GlintFixPlugin;
type GlintReportPluginCtor = typeof GlintReportPlugin;
type GlintCommentPluginCtor = typeof GlintCommentPlugin;

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
