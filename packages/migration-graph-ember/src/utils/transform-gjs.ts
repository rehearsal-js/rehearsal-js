import { preprocessEmbeddedTemplates as babelPreprocessEmbeddedTemplates } from 'babel-plugin-htmlbars-inline-precompile';

import debug from 'debug';

const DEBUG_CALLBACK = debug('rehearsal:migration-graph-ember:transform-gjs');

const getTemplateLocalsRequirePath = require.resolve('@glimmer/syntax');

const TEMPLATE_TAG_CONFIG = {
  getTemplateLocalsRequirePath,
  getTemplateLocalsExportPath: 'getTemplateLocals',

  templateTag: 'template',
  templateTagReplacement: 'GLIMMER_TEMPLATE',

  includeSourceMaps: false,
  includeTemplateTokens: false,
};

export function transformGjs(filename: string, source: string): string {
  DEBUG_CALLBACK(`transforming %s to .js`, {});

  const { output } = babelPreprocessEmbeddedTemplates(
    source,
    Object.assign({ relativePath: filename }, TEMPLATE_TAG_CONFIG)
  );

  return output;
}
