import {
  codefixes,
  hints,
  type DiagnosticWithContext,
  type FixedFile,
  type CodeFixKind,
} from '@rehearsal/codefixes';
import { type PluginResult, Plugin } from '@rehearsal/service';
import {
  applyTextChange,
  findNodeAtPosition,
  isNodeInsideJsx,
  normalizeTextChanges,
} from '@rehearsal/utils';
import {
  type DiagnosticWithLocation,
  getLineAndCharacterOfPosition,
  getPositionOfLineAndCharacter,
  TextChange,
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

      const fix = codefixes.getCodeFixes(diagnostic);
      const fixedFiles: FixedFile[] = [];
      const hint = hints.getHint(diagnostic);

      if (fix) {
        for (const fileTextChange of fix.changes) {
          let text = this.service.getFileText(fileTextChange.fileName);

          const textChanges = normalizeTextChanges([...fileTextChange.textChanges]);
          for (const textChange of textChanges) {
            fixedFiles.push(this.convertTextChangeToFixedFile(fileName, textChange));

            text = applyTextChange(text, textChange);
          }

          this.service.setFileText(fileTextChange.fileName, text);
          allFixedFiles.add(fileTextChange.fileName);

          DEBUG_CALLBACK(`- TS${diagnostic.code} at ${diagnostic.start}:\t codefix applied`);
        }
      } else {
        if (addHints) {
          // Add a hint message in case we didn't modify any files (codefix was not applied)
          const text = this.addHintComment(diagnostic, hint, commentTag);

          this.service.setFileText(fileName, text);
          allFixedFiles.add(fileName);

          DEBUG_CALLBACK(`- TS${diagnostic.code} at ${diagnostic.start}:\t comment added`);
        } else {
          DEBUG_CALLBACK(`- TS${diagnostic.code} at ${diagnostic.start}:\t not handled`);
        }
      }

      const fixed = fix !== undefined;
      const helpUrl = hints.getHelpUrl(diagnostic);
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

    const diagnostics = [
      ...this.service.getSemanticDiagnosticsWithLocation(fileName),
      ...this.service.getSuggestionDiagnostics(fileName),
    ];

    diagnostics.sort((a, b) => a.start - b.start);

    return diagnostics
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
    let comment = `@ts-expect-error ${tag} TODO TS${diagnostic.code}: ${hint}`;
    comment = isNodeInsideJsx(node) ? `{/* ${comment} */}` : `/* ${comment} */`;

    // Make sure the comment is a single because we have to place @ tags right above the issue
    comment = comment.replace(/(\n|\r|\r\n)/gm, ' ');

    const text = diagnostic.file.getFullText();

    return text.slice(0, positionToAddComment) + comment + '\n' + text.slice(positionToAddComment);
  }

  convertTextChangeToFixedFile(fileName: string, textChange: TextChange): FixedFile {
    const sourceFile = this.service.getSourceFile(fileName);
    const { line, character } = getLineAndCharacterOfPosition(sourceFile, textChange.span.start);
    const startLine = line + 1; //bump line 0 to line 1, so on and so forth
    const startColumn = character + 1; //bump character 0 to character 1, so on and so forth
    const newCode = textChange.newText;
    const oldCode = sourceFile.text.substring(
      textChange.span.start,
      textChange.span.start + textChange.span.length
    );

    const getActionKind = (textChange: TextChange): CodeFixKind => {
      if (textChange.span.length === 0) {
        return 'add';
      }

      if (textChange.newText === '') {
        return 'delete';
      }

      return 'replace';
    };

    return {
      fileName,
      newCode,
      oldCode,
      location: {
        startLine,
        startColumn,
        endLine: startLine, //TODO: calculate endLine for multiple line insertion
        endColumn: startColumn + newCode.length, //TODO: calculate endLine for multiple line insertion
      },
      codeFixAction: getActionKind(textChange),
    };
  }
}
