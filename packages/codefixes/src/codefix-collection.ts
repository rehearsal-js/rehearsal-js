import type { Diagnostic, DiagnosticWithLocation, Node, Program, TypeChecker } from 'typescript';
import { flattenDiagnosticMessageText, isIdentifier } from 'typescript';

import { FixTransform } from './fix-transform';

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

  getFixForError(code: number): FixTransform | undefined {
    // TODO: Import dynamically if codefix module for provided code exists

    if (this.list[code]?.codefix !== undefined) {
      return this.list[code].codefix!;
    }

    return undefined;
  }

  getHint(
    diagnostic: DiagnosticWithLocation,
    program: Program,
    checker: TypeChecker,
    node?: Node
  ): string {
    const conditionalHints = this.list[diagnostic.code]?.hints;

    if (conditionalHints !== undefined && node !== undefined) {
      for (const conditionalHint of conditionalHints) {
        if (conditionalHint.when(node, program, checker)) {
          return this.prepareHint(conditionalHint.hint, diagnostic, node);
        }
      }
    }

    const defaultHint =
      this.list[diagnostic.code]?.hint || flattenDiagnosticMessageText(diagnostic.messageText, '.');

    return this.prepareHint(defaultHint, diagnostic, node);
  }

  getHelpUrl(diagnostic: DiagnosticWithLocation): string {
    const defaultHelpUrl = `https://stackoverflow.com/search?tab=votes&q=ts${diagnostic.code}}`;

    return this.list[diagnostic.code]?.helpUrl || defaultHelpUrl;
  }

  /**
   * Prepares a hint message for engineer based on original diagnostic message and `this.hint`
   */
  protected prepareHint(hint: string, diagnostic: Diagnostic, node?: Node): string {
    const message = flattenDiagnosticMessageText(diagnostic.messageText, '. ');

    // Prepare a replacement dictionary
    // e.g. {'{0}': 'p', '{1}': 'any'} for message "Parameter 'p' implicitly has an 'any' type."
    const replacements: { [key: string]: string } =
      message
        // return ["'p'", "'any'"]
        .match(/'[^']+'/gm)
        // converts ["'p'", "'any'"] to {'{0}': 'p', '{1}': 'any'}
        ?.reduce((a, v, i) => ({ ...a, [`{${i}}`]: v.replace(/^\W+|\W+$/g, '') }), {}) || {};

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
