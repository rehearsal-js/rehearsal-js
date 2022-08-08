import ts from 'typescript';

import { Plugin, type PluginParams, type PluginResult } from '@rehearsal/service';
import { FixResult, FixTransform } from '@rehearsal/plugins';
import { findNodeAtPosition, isJsxTextNode } from '@rehearsal/utils';
import { FixTransform7006 } from '../transforms';

/**
 * Apply transforms to add types to files
 */
export class DiscoverTypesPlugin extends Plugin {
  async run(params: PluginParams<undefined>): PluginResult {
    const { fileName } = params;
    this.logger?.debug(`Plugin 'DiscoverTypes' run on ${fileName}`);

    let diagnostics = this.service.getSemanticDiagnosticsWithLocation(fileName);

    let tries = diagnostics.length + 1;

    const allFixedFiles: Set<string> = new Set();

    while (diagnostics.length > 0 && tries-- > 0) {
      const diagnostic = diagnostics.shift()!;

      const fix = getFixForDiagnostic(diagnostic);
      const node = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
      const fixResult: FixResult = fix.run(diagnostic, this.service);
      const hint = this.prepareHint(diagnostic.messageText, fix?.hint);

      if (fixResult.fixedFiles.length > 0) {
        this.logger?.debug(` - TS${diagnostic.code} at ${diagnostic.start}:\t fix applied`);

        for (const fixedFile of fixResult.fixedFiles) {
          this.service.setFileText(fixedFile.fileName, fixedFile.updatedText || 'ERROR');
          allFixedFiles.add(fixedFile.fileName);
        }
      } else {
        this.logger?.debug(
          ` - TS${diagnostic.code} at ${diagnostic.start}:\t !!! Unhandled diagnostic !!!`
        );
        // // Add a hint comment if fix was not applied
        // const text = this.addHintComment(diagnostic, hint);
        // this.service.setFileText(params.fileName, text);
        // allFixedFiles.add(params.fileName);

        // this.logger?.debug(` - TS${diagnostic.code} at ${diagnostic.start}:\t comment added`);
      }

      this.reporter?.addItem(diagnostic, fixResult, node, hint);

      // Get updated list of diagnostics
      diagnostics = this.service.getSemanticDiagnosticsWithLocation(params.fileName);
    }

    // const moreDiagnostics = this.service.getSemanticDiagnosticsWithLocation(fileName);

    // this.logger?.debug(`>>>>> MORE DIAGNOSTICS`);
    // moreDiagnostics.forEach((diagnostic) => {
    //   this.logger?.debug(
    //     ` - TS${diagnostic.code} at ${diagnostic.start}:\t !!! no comment added !!!`
    //   );
    // });

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
    7006: FixTransform7006,
  };

  return diagnostic.code in availableFixes
    ? new availableFixes[diagnostic.code]()
    : new FixTransform();
}
