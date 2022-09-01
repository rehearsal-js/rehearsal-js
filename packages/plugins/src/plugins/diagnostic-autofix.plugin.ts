import ts from 'typescript';
import { Plugin, type PluginParams, type PluginResult } from '@rehearsal/service';
import { findNodeAtPosition, isNodeInsideJsx } from '@rehearsal/utils';
import { codefixes, type FixedFile } from '@rehearsal/codefixes';

import { getFilesData } from '../data';

/**
 * Diagnose issues in the file and applied transforms to fix them
 */
export class DiagnosticAutofixPlugin extends Plugin {
  async run(params: PluginParams<undefined>): PluginResult {
    const commentTag = '@rehearsal';

    const { fileName } = params;
    let diagnostics = this.getDiagnostics(fileName, commentTag);
    let tries = diagnostics.length + 1;

    this.logger?.debug(`Plugin 'DiagnosticAutofix' run on ${fileName}`);

    const allFixedFiles: Set<string> = new Set();
    while (diagnostics.length > 0 && tries-- > 0) {
      // TODO: Wrap the next 5 const into DiagnosticContext
      const diagnostic = diagnostics.shift()!;
      const node = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
      const service = this.service.getLanguageService();
      const program = service.getProgram()!;
      const checker = program.getTypeChecker();

      if (!node) {
        continue;
      }

      const fix = codefixes.getFixForError(diagnostic.code);

      const fixedFiles: FixedFile[] = fix?.run(diagnostic, this.service) || [];
      const hint = codefixes.getHint(diagnostic, program, checker, node);

      const fixed = fixedFiles.length > 0;

      if (fixed) {
        for (const fixedFile of fixedFiles) {
          this.service.setFileText(fixedFile.fileName, fixedFile.updatedText!);
          allFixedFiles.add(fixedFile.fileName);
        }

        this.logger?.debug(` - TS${diagnostic.code} at ${diagnostic.start}:\t fix applied`);
      } else {
        // Get a hint message in case we didn't modify any files (codefix was not applied)
        const text = this.addHintComment(diagnostic, hint, commentTag);
        this.service.setFileText(params.fileName, text);
        allFixedFiles.add(params.fileName);

        this.logger?.debug(` - TS${diagnostic.code} at ${diagnostic.start}:\t comment added`);
      }

      const processedFiles = getFilesData(fixedFiles, diagnostic, hint);

      this.reporter?.addItem(diagnostic, processedFiles, fixed, node, hint);

      // Get updated list of diagnostics
      diagnostics = this.getDiagnostics(params.fileName, commentTag);
    }

    return Array.from(allFixedFiles);
  }

  getDiagnostics(fileName: string, tag: string): ts.DiagnosticWithLocation[] {
    return this.service
      .getSemanticDiagnosticsWithLocation(fileName)
      .filter((diagnostic) => !this.getHintComment(diagnostic, tag)); // Except diagnostics with comment
  }

  /**
   * Tries to find a `@rehearsal` on the first non-empty line above the affected node
   * It uses ts.getSpanOfEnclosingComment to check if the @rehearsal is a part of comment line
   */
  getHintComment(diagnostic: ts.DiagnosticWithLocation, tag: string): string | undefined {
    // Search for a position to add comment - the first element at the line with affected node
    const sourceFile = diagnostic.file;
    const lineWithNode = ts.getLineAndCharacterOfPosition(sourceFile, diagnostic.start).line;

    if (lineWithNode === 0) {
      return undefined;
    }

    // Search for the first non-empty line above the node
    let lineAbove = lineWithNode - 1;
    let lineAboveText = '';
    let lineAboveStart = 0;

    do {
      lineAboveStart = sourceFile.getPositionOfLineAndCharacter(lineAbove, 0);
      const lineAboveEnd = sourceFile.getLineEndOfPosition(lineAboveStart);

      lineAboveText = sourceFile.getFullText().substring(lineAboveStart, lineAboveEnd).trim();
      // Trim all empty spaces including `//:line:` hack
      lineAboveText = lineAboveText.replace(/^\s*(\/\/:line:)?$/gm, '');

      lineAbove -= 1;
    } while (lineAbove > 0 && lineAboveText === '');

    // Check if line contains `@rehearsal` tag
    const tagIndex = lineAboveText.indexOf(tag);

    if (tagIndex === -1) {
      return undefined;
    }

    const tagStart = lineAboveStart + tagIndex;

    // Make sure the tag within a comment (not a part of string value)
    const commentSpan = this.service
      .getLanguageService()
      .getSpanOfEnclosingComment(sourceFile.fileName, tagStart, false);

    if (commentSpan === undefined) {
      return undefined;
    }

    // Get a text after tag till the end of comment
    return sourceFile
      .getFullText()
      .substring(tagStart + tag.length, commentSpan.start + commentSpan.length) // grab `@rehearsal ... */`
      .replace(/\*\/(})?$/gm, '') // remove */ or */} from the end
      .trim();
  }

  /**
   * Builds and adds a `@rehearsal` comment above the affected node
   */
  addHintComment(diagnostic: ts.DiagnosticWithLocation, hint: string, tag: string): string {
    // Search for a position to add comment - the first element at the line with affected node
    const line = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start).line;
    const positionToAddComment = ts.getPositionOfLineAndCharacter(diagnostic.file, line, 0);

    const node = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length)!;

    // TODO: Pass a comment template in config
    let comment = `@ts-ignore ${tag} TODO TS${diagnostic.code}: ${hint}`;
    comment = isNodeInsideJsx(node) ? `{/* ${comment} */}` : `/* ${comment} */`;

    const text = diagnostic.file.getFullText();

    return text.slice(0, positionToAddComment) + comment + '\n' + text.slice(positionToAddComment);
  }
}
