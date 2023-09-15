import { createRequire } from 'node:module';
import { DiagnosticWithContext, hints } from '@rehearsal/codefixes';
import { findNodeAtPosition } from '@rehearsal/ts-utils';
import debug from 'debug';
import ts from 'typescript';
import { PluginOptions, Plugin } from '../plugin.js';
import {
  findDiagnosticNode,
  getConditionalCommentPos,
  inJsxText,
  inTemplateExpressionText,
  onMultilineConditionalTokenLine,
} from './utils.js';

import type MS from 'magic-string';
import type { Service } from '@rehearsal/service';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const MagicString = require('magic-string');

const { DiagnosticCategory, getLineAndCharacterOfPosition, getPositionOfLineAndCharacter } = ts;
const DEBUG_CALLBACK = debug('rehearsal:plugins:diagnostic-comment');

export interface DiagnosticCommentPluginOptions extends PluginOptions {
  addHints: boolean;
  commentTag: string;
}

export class DiagnosticCommentPlugin extends Plugin<DiagnosticCommentPluginOptions> {
  private changeTrackers: Map<string, MS.default> = new Map();
  private ignoreLines: { [line: number]: boolean } = {};

  async run(): Promise<string[]> {
    const { fileName, context, options } = this;

    const diagnostics = this.getDiagnostics(context.service, fileName);

    DEBUG_CALLBACK(`Plugin 'DiagnosticCommentPlugin' run on %O:`, fileName);

    const allFixedFiles: Set<string> = new Set();

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

  getDiagnostics(service: Service, fileName: string): DiagnosticWithContext[] {
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
        (diagnostic) => this.isValidDiagnostic(diagnostic) && this.isErrorDiagnostic(diagnostic)
      );
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
     * The following logic has been ported from https://github.com/airbnb/ts-migrate/blob/master/packages/ts-migrate-plugins/src/plugins/ts-ignore.ts#L199 and modified for our use cases
     *
     * It correctly finds the valid place to stick the inline comment
     */
    if (!this.ignoreLines[lineAndChar.line]) {
      const commentLine = lineAndChar.line;
      const pos = getPositionOfLineAndCharacter(diagnostic.file, commentLine, 0);

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
