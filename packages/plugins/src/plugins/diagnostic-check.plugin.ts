import {
  Plugin,
  PluginOptions,
  type PluginResult,
  PluginsRunnerContext,
  RehearsalService,
} from '@rehearsal/service';
import { debug } from 'debug';
import {
  DiagnosticCategory,
  findAncestor,
  getLineAndCharacterOfPosition,
  getPositionOfLineAndCharacter,
  isTemplateLiteral,
  LanguageService,
} from 'typescript';
import { DiagnosticWithContext, hints } from '@rehearsal/codefixes';
import { findNodeAtPosition, isNodeInsideJsx } from '@rehearsal/utils';
import { getLocation } from '../helpers';

const DEBUG_CALLBACK = debug('rehearsal:plugins:diagnostic-check');

export interface DiagnosticCheckPluginOptions extends PluginOptions {
  addHints?: boolean;
  commentTag?: string;
}

export class DiagnosticCheckPlugin implements Plugin<DiagnosticCheckPluginOptions> {
  async run(
    fileName: string,
    context: PluginsRunnerContext,
    options: DiagnosticCheckPluginOptions
  ): PluginResult {
    options.addHints ??= true;
    options.commentTag ??= `@rehearsal`;

    let diagnostics = this.getDiagnostics(context.rehearsal, fileName, options.commentTag);

    DEBUG_CALLBACK(`Plugin 'DiagnosticCheck' run on %O:`, fileName);

    const allFixedFiles: Set<string> = new Set();

    while (diagnostics.length > 0) {
      const diagnostic = diagnostics.shift()!;
      const hint = hints.getHint(diagnostic);

      if (options.addHints) {
        const text = this.addHintComment(diagnostic, hint, options.commentTag);
        context.rehearsal.setFileText(fileName, text);

        allFixedFiles.add(fileName);
        DEBUG_CALLBACK(`- TS${diagnostic.code} at ${diagnostic.start}:\t comment added`);
      } else {
        DEBUG_CALLBACK(`- TS${diagnostic.code} at ${diagnostic.start}:\t not handled`);
      }

      const helpUrl = hints.getHelpUrl(diagnostic);
      const location = getLocation(diagnostic.file, diagnostic.start, diagnostic.length);
      context.reporter.addTSItem(
        diagnostic,
        diagnostic.node,
        location,
        hint,
        helpUrl,
        options.addHints
      );

      diagnostics = this.getDiagnostics(context.rehearsal, fileName, options.commentTag);
    }
    return Array.from(allFixedFiles);
  }

  getDiagnostics(
    rehearsalService: RehearsalService,
    fileName: string,
    tag: string
  ): DiagnosticWithContext[] {
    const service = rehearsalService.getLanguageService();
    const program = service.getProgram()!;
    const checker = program!.getTypeChecker();

    const diagnostics = [
      ...rehearsalService.getSemanticDiagnosticsWithLocation(fileName),
      ...rehearsalService.getSuggestionDiagnostics(fileName),
    ];

    //Sort diagnostics from top to bottom, so that we add comments from top to bottom
    //This will ensure we calculate the line numbers correctly
    diagnostics.sort((a, b) => a.start - b.start);

    return diagnostics
      .map((diagnostic) => ({
        ...diagnostic,
        service,
        program,
        checker,
        node: findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length),
      }))
      .filter(
        (diagnostic) =>
          this.isValidDiagnostic(diagnostic) &&
          this.isErrorDiagnostic(diagnostic) &&
          this.hasNotAddedDiagnosticComment(diagnostic, tag, service)
      );
  }

  /**
   * Tries to find a `@rehearsal` on the first non-empty line above the affected node
   * It uses ts.getSpanOfEnclosingComment to check if the @rehearsal is a part of comment line
   */
  hasNotAddedDiagnosticComment(
    diagnostic: DiagnosticWithContext,
    tag: string,
    service: LanguageService
  ): boolean {
    // Search for a position to add comment - the first element at the line with affected node
    const sourceFile = diagnostic.file;

    let lineWithNode = sourceFile.getLineAndCharacterOfPosition(diagnostic.start).line;

    // In case of issue inside template literal the node line will the start of template literal
    const templateLiteralNode = findAncestor(diagnostic.node, isTemplateLiteral);
    if (templateLiteralNode) {
      lineWithNode = sourceFile.getLineAndCharacterOfPosition(templateLiteralNode.getStart()).line;
    }

    if (lineWithNode === 0) {
      return true;
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
      return true;
    }

    const tagStart = lineAboveStart + tagIndex;

    // Make sure the tag within a comment (not a part of string value)
    const commentSpan = service.getSpanOfEnclosingComment(sourceFile.fileName, tagStart, false);

    if (commentSpan === undefined) {
      return true;
    }

    const comment = sourceFile
      .getFullText()
      .substring(tagStart + tag.length, commentSpan.start + commentSpan.length) // grab `@rehearsal ... */`
      .replace(/\*\/(})?$/gm, '') // remove */ or */} from the end
      .trim();
    return !comment;
  }

  /**
   * Builds and adds a `@rehearsal` comment above the affected node
   */
  addHintComment(diagnostic: DiagnosticWithContext, hint: string, tag: string): string {
    // Search for a position to add comment - the first element at the line with affected node
    let line = getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start).line;

    // In case of issue inside template literal the node line will the start of template literal
    // See https://github.com/microsoft/TypeScript/issues/51600 if another solution will be implemented
    const templateLiteralNode = findAncestor(diagnostic.node, isTemplateLiteral);
    if (templateLiteralNode) {
      line = getLineAndCharacterOfPosition(diagnostic.file, templateLiteralNode.getStart()).line;
    }

    const positionToAddComment = getPositionOfLineAndCharacter(diagnostic.file, line, 0);

    // TODO: Pass a comment template in config
    let comment = `@ts-expect-error ${tag} TODO TS${diagnostic.code}: ${hint}`;
    comment =
      diagnostic.node && isNodeInsideJsx(diagnostic.node)
        ? `{/* ${comment} */}`
        : `/* ${comment} */`;

    // Make sure the comment is a single because we have to place @ tags right above the issue
    comment = comment.replace(/(\n|\r|\r\n)/gm, ' ');

    const text = diagnostic.file.getFullText();

    return text.slice(0, positionToAddComment) + comment + '\n' + text.slice(positionToAddComment);
  }

  isValidDiagnostic(diagnostic: DiagnosticWithContext): boolean {
    return !!diagnostic.node;
  }

  isErrorDiagnostic(diagnostic: DiagnosticWithContext): boolean {
    return diagnostic.category === DiagnosticCategory.Error;
  }
}
