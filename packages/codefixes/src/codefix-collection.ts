import {
  flattenDiagnosticMessageText,
  isIdentifier,
  type DiagnosticWithLocation,
  type LanguageService,
  type Node,
  type Program,
  type TypeChecker,
} from 'typescript';

import { FixTransform } from './fix-transform';

export interface DiagnosticWithContext extends DiagnosticWithLocation {
  service: LanguageService;
  program: Program;
  checker: TypeChecker;
  node?: Node;
}

export type CodefixList = { [key: number]: CodefixListElement };

export type CodefixListElement = {
  hint: string;
  helpUrl?: string;
  codefix?: FixTransform;
  hints?: CodefixHint[];
};

export type CodefixHint = {
  when: (n: Node, p: Program, c: TypeChecker) => boolean;
  hint: string;
};

/**
 * Provides
 */
export class CodeFixCollection {
  readonly list: CodefixList;

  constructor(list: CodefixList) {
    this.list = list;
  }

  getFixForDiagnostic(diagnostic: DiagnosticWithContext): FixTransform | undefined {
    // TODO: Import dynamically if codefix module for provided code exists

    if (this.list[diagnostic.code]?.codefix !== undefined) {
      return this.list[diagnostic.code].codefix!;
    }

    return undefined;
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
      replacements['{node.escapedText}'] = isIdentifier(node)
        ? node.escapedText.toString()
        : node.getText();
    }

    // Replaces {0}, {1}... placeholders with corresponding values from the original message
    // and additional {node.text}, {node.fullText} to corresponding node values
    hint = hint.replace(/{[^}]+}/gm, (key) => replacements[key] || key);

    return hint;
  }
}
