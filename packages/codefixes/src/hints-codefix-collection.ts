import { CodeFixAction, DiagnosticWithLocation, flattenDiagnosticMessageText } from 'typescript';
import { ChangesFactory } from '@rehearsal/utils';
import {
  CodeFixCollection,
  CodeHintList,
  createCodeFixAction,
  type DiagnosticWithContext,
} from './types';

/**
 * Don't actually fix the issue but adds a @ts-expect-error comments instead
 */
export class HintCodeFixCollection implements CodeFixCollection {
  readonly list: CodeHintList;

  constructor(list: CodeHintList) {
    this.list = list;
  }

  getFixForDiagnostic(diagnostic: DiagnosticWithContext): CodeFixAction | undefined {
    const hint = this.getHint(diagnostic);
    const comment = `@ts-expect-error @rehearsal TODO TS${diagnostic.code}: ${hint}`;

    console.log(diagnostic.node?.getText());
    console.log(diagnostic.node?.getStart());

    const changes = ChangesFactory.insertCommentAtLineBeforeNode(
      diagnostic.file,
      diagnostic.node!,
      comment
    );

    return createCodeFixAction('hint', [changes], 'Add hint comment to help solve the issue');
  }

  getHint(diagnostic: DiagnosticWithContext): string {
    const conditionalHints = this.list[diagnostic.code]?.hints;

    if (conditionalHints !== undefined && diagnostic.node !== undefined) {
      for (const conditionalHint of conditionalHints) {
        if (conditionalHint.when(diagnostic.node!, diagnostic.program, diagnostic.checker)) {
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
