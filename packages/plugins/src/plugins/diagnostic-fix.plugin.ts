import { type DiagnosticWithContext, type FixedFile, codefixes, hints } from '@rehearsal/codefixes';
import { type PluginResult, Plugin } from '@rehearsal/service';
import { findNodeAtPosition, isNodeInsideJsx } from '@rehearsal/utils';
import {
  type DiagnosticWithLocation,
  getLineAndCharacterOfPosition,
  getPositionOfLineAndCharacter,
} from 'typescript';
import { debug } from 'debug';
import { getFilesData } from '../data';

const DEBUG_CALLBACK = debug('rehearsal:plugins:diagnostic-fix');

/**
 * Diagnose issues in the file and applied transforms to fix them
 */
export class DiagnosticFixPlugin extends Plugin {
  async run(fileName: string): PluginResult {
    // TODO: Move next 2 lines to constructor options
    const addHints = true;
    const commentTag = '@rehearsal';

    let diagnostics = this.getDiagnostics(fileName, commentTag);
    let tries = diagnostics.length + 1;

    DEBUG_CALLBACK(`Plugin 'DiagnosticFix' run on %O:`, fileName);

    const allFixedFiles: Set<string> = new Set();
    while (diagnostics.length > 0 && tries-- > 0) {
      const diagnostic = diagnostics.shift()!;

      if (!diagnostic.node) {
        DEBUG_CALLBACK(` - TS${diagnostic.code} at ${diagnostic.start}:\t node not found`);
        continue;
      }

      let fixedFiles: FixedFile[] = [];

      const fixes = codefixes.getCodeFixes(diagnostic);

      while (fixes.length > 0 && fixedFiles.length === 0) {
        fixedFiles = fixes.shift()?.run(diagnostic, this.service) || [];
      }

      // TODO: Seems like a good candidate to be moved to `if (addHints)`
      let hint = hints.getHint(diagnostic);
      const helpUrl = hints.getHelpUrl(diagnostic);

      const fixed = fixedFiles.length > 0;

      if (fixed) {
        for (const fixedFile of fixedFiles) {
          this.service.setFileText(fixedFile.fileName, fixedFile.updatedText!);
          allFixedFiles.add(fixedFile.fileName);
        }

        DEBUG_CALLBACK(`- TS${diagnostic.code} at ${diagnostic.start}:\t codefix applied`);
      } else {
        if (addHints) {
          // Add a hint message in case we didn't modify any files (codefix was not applied)
          const text = this.addHintComment(diagnostic, hint, commentTag);
          this.service.setFileText(fileName, text);
          allFixedFiles.add(fileName);

          DEBUG_CALLBACK(`- TS${diagnostic.code} at ${diagnostic.start}:\t comment added`);
        } else {
          hint = '';
          DEBUG_CALLBACK(`- TS${diagnostic.code} at ${diagnostic.start}:\t not handled`);
        }
      }

      const processedFiles = getFilesData(fixedFiles, diagnostic, hint);

      this.reporter?.addItem(diagnostic, processedFiles, fixed, diagnostic.node, hint, helpUrl);

      // Get updated list of diagnostics
      diagnostics = this.getDiagnostics(fileName, commentTag);
    }

    return Array.from(allFixedFiles);
  }

  /**
   * Returns the list of diagnostics with location and additional context of the application
   */
  getDiagnostics(fileName: string, tag: string): DiagnosticWithContext[] {
    const service = this.service.getLanguageService();
    const program = service.getProgram()!;
    const checker = program.getTypeChecker();

    return this.service
      .getSemanticDiagnosticsWithLocation(fileName)
      .filter((diagnostic) => !this.getHintComment(diagnostic, tag)) // Except diagnostics with comment
      .map<DiagnosticWithContext>((diagnostic) => ({
        ...diagnostic,
        ...{
          service,
          program,
          checker,
          node: findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length),
        },
      }));
  }

  /**
   * Tries to find a `@rehearsal` on the first non-empty line above the affected node
   * It uses ts.getSpanOfEnclosingComment to check if the @rehearsal is a part of comment line
   */
  getHintComment(diagnostic: DiagnosticWithLocation, tag: string): string | undefined {
    // Search for a position to add comment - the first element at the line with affected node
    const sourceFile = diagnostic.file;
    const lineWithNode = getLineAndCharacterOfPosition(sourceFile, diagnostic.start).line;

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
  addHintComment(diagnostic: DiagnosticWithLocation, hint: string, tag: string): string {
    // Search for a position to add comment - the first element at the line with affected node
    const line = getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start).line;
    const positionToAddComment = getPositionOfLineAndCharacter(diagnostic.file, line, 0);

    const node = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length)!;

    // TODO: Pass a comment template in config
    let comment = `@ts-ignore ${tag} TODO TS${diagnostic.code}: ${hint}`;
    comment = isNodeInsideJsx(node) ? `{/* ${comment} */}` : `/* ${comment} */`;

    const text = diagnostic.file.getFullText();

    return text.slice(0, positionToAddComment) + comment + '\n' + text.slice(positionToAddComment);
  }
}
