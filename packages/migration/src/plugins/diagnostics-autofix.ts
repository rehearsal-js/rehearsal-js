import ts from 'typescript';

import FixTransform from '../interfaces/fix-transform';
import FixTransform6133 from '../transforms/6133-fix-transform';

/**
 * BELOW:
 * Parts of autofix plugin.
 * Needs to be refactored into a class
 */

/**
 * Creates a `FixTransform` for provided diagnostic
 * @param diagnostic
 */
export function getFixForDiagnostic(diagnostic: ts.Diagnostic): FixTransform {
  const availableFixes: { [index: number]: typeof FixTransform } = {
    6133: FixTransform6133,
  };

  return diagnostic.code in availableFixes
    ? new availableFixes[diagnostic.code]()
    : new FixTransform();
}

/**
 * Builds and adds a hint @ts-ignore comment above the affected node
 */
export function addHintComment(diagnostic: ts.DiagnosticWithLocation, fix?: FixTransform): string {
  const hint = prepareHint(diagnostic.messageText, fix?.hint);

  // Search for a position to add comment - the first element at the line with affected node
  const line = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start).line;
  const positionToAddComment = ts.getPositionOfLineAndCharacter(diagnostic.file, line, 0);

  // TODO: Pass a comment template in config
  let comment = `@ts-ignore @rehearsal TODO TS${diagnostic.code}: ${hint}`;

  comment = diagnostic.file.fileName.includes('tsx') ? `{/* ${comment} */}` : `/* ${comment} */`;

  const text = diagnostic.file.getFullText();

  return text.slice(0, positionToAddComment) + comment + '\n' + text.slice(positionToAddComment);
}

/**
 * Prepares a hint message for engineer based on original diagnostic message and `this.hint`
 */
export function prepareHint(message: string | ts.DiagnosticMessageChain, hint?: string): string {
  message = ts.flattenDiagnosticMessageText(message, '. ');

  if (hint) {
    // Prepare a replacement dictionary
    // e.g. {'{0}': 'p', '{1}': 'any'} for message "Parameter 'p' implicitly has an 'any' type."
    const replacements: { [key: string]: string } =
      message
        // return ["'p'", "'any'"]
        .match(/'[^']+'/gm)
        // converts ["'p'", "'any'"] to {'{0}': 'p', '{1}': 'any'}
        ?.reduce((a, v, i) => ({ ...a, [`{${i}}`]: v.replace(/^\W+|\W+$/g, '') }), {}) || {};

    // Replaces {0}, {1}, ... placeholders with corresponding values from the original message
    message = hint.replace(/{\d+}/gm, (key) => replacements[key] || key);
  }

  return message;
}
