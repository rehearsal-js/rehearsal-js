import { type DiagnosticWithLocation, flattenDiagnosticMessageText } from 'typescript';

import { CodeHintList, DiagnosticWithContext } from './types';

/**
 * Provides access to useful hints for Diagnostics
 */
export class HintsProvider {
  readonly list: CodeHintList;

  constructor(list: CodeHintList) {
    this.list = list;
  }

  getHint(diagnostic: DiagnosticWithContext): string {
    const conditionalHints = this.list[diagnostic.code]?.hints;

    if (conditionalHints !== undefined && diagnostic.node !== undefined) {
      for (const conditionalHint of conditionalHints) {
        if (conditionalHint.when(diagnostic.node, diagnostic.program, diagnostic.checker)) {
          return this.prepareHint(conditionalHint.hint, diagnostic);
        }
      }
    }

    const defaultHint =
      this.list[diagnostic.code]?.hint || flattenDiagnosticMessageText(diagnostic.messageText, '.');

    return this.prepareHint(defaultHint, diagnostic);
  }

  getHelpUrl(diagnostic: DiagnosticWithLocation): string {
    const defaultHelpUrl = `https://stackoverflow.com/search?tab=votes&q=ts${diagnostic.code}}`;

    return this.list[diagnostic.code]?.helpUrl || defaultHelpUrl;
  }

  /**
   * Prepares a hint message for engineer based on original diagnostic message and `this.hint`
   */
  protected prepareHint(hint: string, diagnostic: DiagnosticWithContext): string {
    const message = flattenDiagnosticMessageText(diagnostic.messageText, '. ');

    // Prepare a replacement dictionary
    // e.g. {'{0}': 'p', '{1}': 'any'} for message "Parameter 'p' implicitly has an 'any' type."
    const replacements: { [key: string]: string } =
      message
        // return ["'p'", "'any'"]
        .match(/'[^']+'/gm)
        // converts ["'p'", "'any'"] to {'{0}': 'p', '{1}': 'any'}
        ?.reduce((a, v, i) => ({ ...a, [`{${i}}`]: v.replace(/^\W+|\W+$/g, '') }), {}) || {};

    const node = diagnostic.node;

    // Node related replacements
    if (node !== undefined) {
      replacements['{node.text}'] = node.getText();
      replacements['{node.fullText}'] = node.getFullText();
    }

    // Replaces {0}, {1}... placeholders with corresponding values from the original message
    // and additional {node.text}, {node.fullText} to corresponding node values
    hint = hint.replace(/{[^}]+}/gm, (key) => replacements[key] || key);

    return hint;
  }
}
