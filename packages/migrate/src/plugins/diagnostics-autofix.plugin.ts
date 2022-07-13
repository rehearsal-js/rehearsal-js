import ts from 'typescript';

import FixTransform from '../interfaces/fix-transform';

// TODO: Use dynamic import inside getFixForDiagnostic function
import {
  FixTransform2322,
  FixTransform2571,
  FixTransform2790,
  FixTransform6133,
  FixTransform2345,
  FixTransform4082,
} from '../transforms';

import Plugin, { type PluginParams, type PluginResult } from '../interfaces/plugin';
import { findNodeAtPosition, isJsxTextNode } from '../helpers/typescript-ast';

/**
 * Diagnose issues in the file and applied transforms to fix them
 */
export default class DiagnosticAutofixPlugin extends Plugin {
  async run(params: PluginParams<undefined>): PluginResult {
    const { fileName } = params;
    let diagnostics = this.service.getSemanticDiagnosticsWithLocation(fileName);
    let tries = diagnostics.length + 1;

    this.logger?.debug(`Plugin 'DiagnosticAutofix' run on ${fileName}`);

    const allFixedFiles: Set<string> = new Set();
    while (diagnostics.length > 0 && tries-- > 0) {
      const diagnostic = diagnostics.shift()!;

      const fix = getFixForDiagnostic(diagnostic);
      const node = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);

      const fixedFiles = fix.run(diagnostic, this.service);

      const hint = this.prepareHint(diagnostic.messageText, fix?.hint);

      const fixed = fixedFiles.length > 0;

      if (fixed) {
        this.logger?.debug(` - TS${diagnostic.code} at ${diagnostic.start}:\t fix applied`);

        for (const fixedFile of fixedFiles) {
          this.service.setFileText(fixedFile.fileName, fixedFile.text);
          allFixedFiles.add(fixedFile.fileName);
        }
      } else {
        // Add a hint comment if fix was not applied
        const text = this.addHintComment(diagnostic, hint);
        this.service.setFileText(params.fileName, text);
        allFixedFiles.add(params.fileName);

        this.logger?.debug(` - TS${diagnostic.code} at ${diagnostic.start}:\t comment added`);
      }

      this.reporter?.addItem(diagnostic, node, hint, fixed);

      // Get updated list of diagnostics
      diagnostics = this.service.getSemanticDiagnosticsWithLocation(params.fileName);
    }

    return Array.from(allFixedFiles);
  }

  /**
   * Prepares a hint message for engineer based on original diagnostic message and `this.hint`
   */
  prepareHint(message: string | ts.DiagnosticMessageChain, hint?: string): string {
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

  /**
   * Builds and adds a hint @ts-ignore comment above the affected node
   */
  addHintComment(diagnostic: ts.DiagnosticWithLocation, hint: string): string {
    // Search for a position to add comment - the first element at the line with affected node
    const line = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start).line;
    const positionToAddComment = ts.getPositionOfLineAndCharacter(diagnostic.file, line, 0);

    const node = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length)!;

    // TODO: Pass a comment template in config
    let comment = `@ts-ignore @rehearsal TODO TS${diagnostic.code}: ${hint}`;
    comment = isJsxTextNode(node) ? `{/* ${comment} */}` : `/* ${comment} */`;

    const text = diagnostic.file.getFullText();

    return text.slice(0, positionToAddComment) + comment + '\n' + text.slice(positionToAddComment);
  }
}

/**
 * Creates a `FixTransform` for provided diagnostic
 * @param diagnostic
 */
export function getFixForDiagnostic(diagnostic: ts.Diagnostic): FixTransform {
  const availableFixes: { [index: number]: typeof FixTransform } = {
    2322: FixTransform2322,
    2571: FixTransform2571,
    2790: FixTransform2790,
    6133: FixTransform6133,
    2345: FixTransform2345,
    4082: FixTransform4082,
  };

  return diagnostic.code in availableFixes
    ? new availableFixes[diagnostic.code]()
    : new FixTransform();
}
