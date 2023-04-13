import { createRequire } from 'node:module';
import { DiagnosticWithContext, hints } from '@rehearsal/codefixes';
import {
  Plugin,
  PluginOptions,
  type PluginResult,
  PluginsRunnerContext,
  Service,
} from '@rehearsal/service';
import { findNodeAtPosition } from '@rehearsal/ts-utils';
import debug from 'debug';
import ts, { LanguageService } from 'typescript';
import type MS from 'magic-string';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const MagicString = require('magic-string');

const {
  isTemplateLiteral,
  findAncestor,
  DiagnosticCategory,
  getLineAndCharacterOfPosition,
  getPositionOfLineAndCharacter,
} = ts;
const DEBUG_CALLBACK = debug('rehearsal:plugins:diagnostic-comment');

export interface DiagnosticCommentPluginOptions extends PluginOptions {
  addHints?: boolean;
  commentTag?: string;
}

export class DiagnosticCommentPlugin implements Plugin<DiagnosticCommentPluginOptions> {
  private changeTrackers: Map<string, MS.default> = new Map();
  private ignoreLines: { [line: number]: boolean } = {};
  async run(
    fileName: string,
    context: PluginsRunnerContext,
    options: DiagnosticCommentPluginOptions
  ): PluginResult {
    options.addHints ??= true;
    options.commentTag ??= `@rehearsal`;

    const diagnostics = this.getDiagnostics(context.service, fileName, options.commentTag);

    DEBUG_CALLBACK(`Plugin 'DiagnosticReport' run on %O:`, fileName);

    const allFixedFiles: Set<string> = new Set();

    this.ignoreLines = {};

    for (const diagnostic of diagnostics) {
      if (!this.changeTrackers.has(diagnostic.file.fileName)) {
        const originalText = context.service.getFileText(diagnostic.file.fileName);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const changeTracker: MS.default = new MagicString(originalText);

        this.changeTrackers.set(diagnostic.file.fileName, changeTracker);
      }

      const hint = hints.getHint(diagnostic).replace(context.basePath, '.');

      if (options.addHints) {
        this.addHintComment(diagnostic, hint, options.commentTag);
        allFixedFiles.add(fileName);
        DEBUG_CALLBACK(`- TS${diagnostic.code} at ${diagnostic.start}:\t comment added`);
      } else {
        DEBUG_CALLBACK(`- TS${diagnostic.code} at ${diagnostic.start}:\t not handled`);
      }
    }

    this.changeTrackers.forEach((changeTracker, file) => {
      context.service.setFileText(file, changeTracker.toString());
    });

    return Promise.resolve(Array.from(allFixedFiles));
  }

  getDiagnostics(service: Service, fileName: string, tag: string): DiagnosticWithContext[] {
    const languageService = service.getLanguageService();
    const program = languageService.getProgram()!;
    const checker = program.getTypeChecker();

    const diagnostics = service.getDiagnostics(fileName);

    return diagnostics
      .map((diagnostic) => ({
        ...diagnostic,
        service: languageService,
        program,
        checker,
        node: findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length),
      }))
      .filter(
        (diagnostic) =>
          this.isValidDiagnostic(diagnostic) &&
          this.isErrorDiagnostic(diagnostic) &&
          this.hasNotAddedDiagnosticComment(diagnostic, tag, languageService)
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
  addHintComment(diagnostic: DiagnosticWithContext, hint: string, tag: string): void {
    const changeTracker = this.changeTrackers.get(diagnostic.file.fileName);

    if (!changeTracker) {
      throw new Error('Invariant');
    }

    const tsIgnoreCommentText = `@ts-expect-error ${tag} TODO TS${diagnostic.code}: ${hint}`;

    // Search for a position to add comment - the first element at the line with affected node
    const lineAndChar = getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);

    /**
     * The following logic has been ported from  https://github.com/airbnb/ts-migrate/blob/master/packages/ts-migrate-plugins/src/plugins/ts-ignore.ts#L199
     *
     * It correctly finds the valid place to stick the inline comment
     */
    if (!this.ignoreLines[lineAndChar.line]) {
      let commentLine = lineAndChar.line;
      let pos = getPositionOfLineAndCharacter(diagnostic.file, commentLine, 0);

      const previousLine = commentLine - 1;
      const prevLinePos = getPositionOfLineAndCharacter(diagnostic.file, commentLine, 0);
      commentLine = previousLine;
      pos = prevLinePos;

      let ws = '';
      let i = pos;
      while (diagnostic.file.text[i] === ' ') {
        i += 1;
        ws += ' ';
      }

      if (inTemplateExpressionText(diagnostic.file, pos)) {
        const node = findDiagnosticNode(diagnostic, diagnostic.file);
        if (node) {
          changeTracker.appendRight(
            node.pos,
            `${ws}${ts.sys.newLine}// ${tsIgnoreCommentText} ${
              changeTracker.original[node.pos] !== ts.sys.newLine ? ts.sys.newLine : ''
            }`
          );
        } else {
          throw new Error(`Failed to add @ts-expect-error within template expression.`);
        }
      } else if (inJsxText(diagnostic.file, pos)) {
        changeTracker.appendRight(pos, `${ws}{/* ${tsIgnoreCommentText} */}${ts.sys.newLine}`);
      } else if (onMultilineConditionalTokenLine(diagnostic.file, diagnostic.start)) {
        changeTracker.appendRight(
          getConditionalCommentPos(diagnostic.file, diagnostic.start),
          ` // ${tsIgnoreCommentText}${ts.sys.newLine}${ws} `
        );
      } else {
        changeTracker.appendRight(pos, `${ws}// ${tsIgnoreCommentText}${ts.sys.newLine}`);
      }

      this.ignoreLines[lineAndChar.line] = true;
    }
  }

  isValidDiagnostic(diagnostic: DiagnosticWithContext): boolean {
    return !!diagnostic.node;
  }

  isErrorDiagnostic(diagnostic: DiagnosticWithContext): boolean {
    return diagnostic.category === DiagnosticCategory.Error;
  }
}

function inTemplateExpressionText(sourceFile: ts.SourceFile, pos: number): boolean {
  const visitor = (node: ts.Node): boolean | undefined => {
    if (node.pos <= pos && pos < node.end && ts.isTemplateExpression(node)) {
      const inHead = node.head.pos <= pos && pos < node.head.end;
      const inMiddleOrTail = node.templateSpans.some(
        (span) => span.literal.pos <= pos && pos < span.literal.end
      );
      if (inHead || inMiddleOrTail) {
        return true;
      }
    }

    return ts.forEachChild(node, visitor);
  };

  return !!ts.forEachChild(sourceFile, visitor);
}

function findDiagnosticNode(
  diagnostic: ts.DiagnosticWithLocation,
  sourceFile: ts.SourceFile
): ts.Node | undefined {
  const visitor = (node: ts.Node): ts.Node | undefined =>
    isDiagnosticNode(node, diagnostic, sourceFile) ? node : ts.forEachChild(node, visitor);

  return visitor(sourceFile);
}

function isDiagnosticNode(
  node: ts.Node,
  diagnostic: ts.DiagnosticWithLocation,
  sourceFile: ts.SourceFile
): boolean {
  return (
    node.getStart(sourceFile) === diagnostic.start &&
    node.getEnd() === diagnostic.start + diagnostic.length
  );
}

function inJsxText(sourceFile: ts.SourceFile, pos: number): boolean {
  const visitor = (node: ts.Node): boolean | undefined => {
    if (node.pos <= pos && pos < node.end && (ts.isJsxElement(node) || ts.isJsxFragment(node))) {
      const isJsxTextChild = node.children.some(
        (child) => ts.isJsxText(child) && child.pos <= pos && pos < child.end
      );
      const isClosingElement = !ts.isJsxFragment(node) && node.closingElement.pos === pos;
      if (isJsxTextChild || isClosingElement) {
        return true;
      }
    }

    return ts.forEachChild(node, visitor);
  };

  return !!ts.forEachChild(sourceFile, visitor);
}

function onMultilineConditionalTokenLine(sourceFile: ts.SourceFile, pos: number): boolean {
  const conditionalExpression = getConditionalExpressionAtPos(sourceFile, pos);
  // Not in a conditional expression.
  if (!conditionalExpression) {
    return false;
  }

  const { line: questionTokenLine } = ts.getLineAndCharacterOfPosition(
    sourceFile,
    conditionalExpression.questionToken.end
  );
  const { line: colonTokenLine } = ts.getLineAndCharacterOfPosition(
    sourceFile,
    conditionalExpression.colonToken.end
  );
  // Single line conditional expression.
  if (questionTokenLine === colonTokenLine) {
    return false;
  }

  const { line } = ts.getLineAndCharacterOfPosition(sourceFile, pos);
  return visitConditionalExpressionWhen(conditionalExpression, pos, {
    // On question token line of multiline conditional expression.
    whenTrue: () => line === questionTokenLine,
    // On colon token line of multiline conditional expression.
    whenFalse: () => line === colonTokenLine,
    otherwise: () => false,
  });
}

function getConditionalExpressionAtPos(
  sourceFile: ts.SourceFile,
  pos: number
): ts.ConditionalExpression | undefined {
  const visitor = (node: ts.Node): ts.ConditionalExpression | undefined => {
    if (node.pos <= pos && pos < node.end && ts.isConditionalExpression(node)) {
      return node;
    }
    return ts.forEachChild(node, visitor);
  };
  return ts.forEachChild(sourceFile, visitor);
}

function visitConditionalExpressionWhen<T>(
  node: ts.ConditionalExpression | undefined,
  pos: number,
  visitor: {
    whenTrue(node: ts.ConditionalExpression): T;
    whenFalse(node: ts.ConditionalExpression): T;
    otherwise(): T;
  }
): T {
  if (!node) {
    return visitor.otherwise();
  }

  const inWhenTrue = node.whenTrue.pos <= pos && pos < node.whenTrue.end;
  if (inWhenTrue) {
    return visitor.whenTrue(node);
  }

  const inWhenFalse = node.whenFalse.pos <= pos && pos < node.whenFalse.end;
  if (inWhenFalse) {
    return visitor.whenFalse(node);
  }

  return visitor.otherwise();
}

function getConditionalCommentPos(sourceFile: ts.SourceFile, pos: number): number {
  return visitConditionalExpressionWhen(getConditionalExpressionAtPos(sourceFile, pos), pos, {
    whenTrue: (node) => node.questionToken.end,
    whenFalse: (node) => node.colonToken.end,
    otherwise: () => pos,
  });
}
