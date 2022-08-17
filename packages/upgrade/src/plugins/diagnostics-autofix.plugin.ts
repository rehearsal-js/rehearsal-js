import ts from 'typescript';

import { Plugin, type PluginParams, type PluginResult } from '@rehearsal/service';

import { FixedFile } from '@rehearsal/plugins';

import { codefixes } from '../transforms';

import { findNodeAtPosition, isJsxTextNode } from '@rehearsal/utils';

/**
 * Diagnose issues in the file and applied transforms to fix them
 */
export class DiagnosticAutofixPlugin extends Plugin {
  async run(params: PluginParams<undefined>): PluginResult {
    const { fileName } = params;
    let diagnostics = this.service.getSemanticDiagnosticsWithLocation(fileName);
    let tries = diagnostics.length + 1;

    this.logger?.debug(`Plugin 'DiagnosticAutofix' run on ${fileName}`);

    const allFixedFiles: Set<string> = new Set();
    while (diagnostics.length > 0 && tries-- > 0) {
      // TODO: Wrap the next 4 const into DiagnosticContext
      const diagnostic = diagnostics.shift()!;
      const node = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
      const program = this.service.getLanguageService().getProgram()!;
      const checker = program.getTypeChecker();

      const fix = codefixes.getFixForError(diagnostic.code);

      const fixedFiles: FixedFile[] = fix?.run(diagnostic, this.service) || [];
      const commentedFiles: FixedFile[] = [];
      const hint = codefixes.getHint(diagnostic, program, checker, node);

      if (fixedFiles && fixedFiles.length > 0) {
        for (const fixedFile of fixedFiles) {
          this.service.setFileText(fixedFile.fileName, fixedFile.updatedText!);
          delete fixedFile.updatedText; // ???
          allFixedFiles.add(fixedFile.fileName);
        }

        this.logger?.debug(` - TS${diagnostic.code} at ${diagnostic.start}:\t fix applied`);
      } else {
        // Get a hint message in case we didn't modify any files (codefix was not applied)
        const text = this.addHintComment(diagnostic, hint);
        this.service.setFileText(params.fileName, text);
        allFixedFiles.add(params.fileName);

        commentedFiles.push({
          fileName: params.fileName,
          location: ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start),
        });

        this.logger?.debug(` - TS${diagnostic.code} at ${diagnostic.start}:\t comment added`);
      }

      this.reporter?.addItem(diagnostic, fixedFiles, commentedFiles, node, hint);

      // Get updated list of diagnostics
      diagnostics = this.service.getSemanticDiagnosticsWithLocation(params.fileName);
    }

    return Array.from(allFixedFiles);
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
