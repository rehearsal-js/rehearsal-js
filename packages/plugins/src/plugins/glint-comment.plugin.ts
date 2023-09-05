import { extname } from 'node:path';
import { createRequire } from 'node:module';
import { DiagnosticWithContext, hints, getDiagnosticOrder } from '@rehearsal/codefixes';
import { type Location } from '@rehearsal/reporter';
import ts from 'typescript';
import debug from 'debug';
import { PluginOptions, Plugin } from '../plugin.js';
import { getLocation } from '../helpers.js';
import { getConditionalCommentPos, onMultilineConditionalTokenLine } from './utils.js';

import type { TransformManager } from '@glint/core';
import type MS from 'magic-string';
import type { Service, GlintService, PathUtils } from '@rehearsal/service';

const DEBUG_CALLBACK = debug('rehearsal:plugins:glint-comment');

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const MagicString = require('magic-string');

export interface GlintCommentPluginOptions extends PluginOptions {
  commentTag: string;
}

type TransformedInfo = NonNullable<
  ReturnType<TransformManager['findTransformInfoForOriginalFile']>
>;

export interface DiagnosticWithLocation extends DiagnosticWithContext {
  location: Location;
}

export class GlintCommentPlugin extends Plugin<GlintCommentPluginOptions> {
  changeTrackers: Map<string, MS.default> = new Map();
  ignoreLines: { [line: number]: boolean } = {};

  async run(): Promise<string[]> {
    const { fileName, context, options } = this;
    const service = context.service as GlintService;
    const diagnostics = this.getDiagnostics(service, fileName);

    if (!diagnostics.length) {
      return [];
    }

    const fixedFiles: Set<string> = new Set();

    for (const diagnostic of diagnostics) {
      if (!this.changeTrackers.has(diagnostic.file.fileName)) {
        const originalText = context.service.getFileText(diagnostic.file.fileName);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const changeTracker: MS.default = new MagicString(originalText);

        this.changeTrackers.set(diagnostic.file.fileName, changeTracker);
      }

      const hint = hints.getHint(diagnostic).replace(context.basePath, '.');
      this.addHintComment(service, diagnostic, hint, options.commentTag);
      DEBUG_CALLBACK(`- TS${diagnostic.code} at ${diagnostic.start}:\t comment added`);
      fixedFiles.add(fileName);
    }

    this.changeTrackers.forEach((changeTracker, fileName) => {
      context.service.setFileText(fileName, changeTracker.toString());
    });

    return Promise.resolve(Array.from(fixedFiles));
  }

  getDiagnostics(service: Service, fileName: string): DiagnosticWithLocation[] {
    const languageService = service.getLanguageService();
    const program = languageService.getProgram()!;
    const checker = program.getTypeChecker();

    const diagnostics = getDiagnosticOrder(service.getDiagnostics(fileName));

    return diagnostics.reduce<DiagnosticWithLocation[]>((acc, diagnostic) => {
      const location = getLocation(diagnostic.file, diagnostic.start, diagnostic.length);
      const startLine = location.startLine;

      if (acc.some((v) => v.location.startLine === startLine)) {
        return acc;
      }

      acc.push({
        ...diagnostic,
        location,
        service: languageService,
        program,
        checker,
      });

      return acc;
    }, []);
  }

  /*
    Builds and adds a `@rehearsal` comment above the affected node
   */
  addHintComment(
    service: GlintService,
    diagnostic: DiagnosticWithContext,
    hint: string,
    commentTag: string
  ): void {
    const changeTracker = this.changeTrackers.get(diagnostic.file.fileName);

    if (!changeTracker) {
      throw new Error('Invariant');
    }

    // Search for a position to add comment - the first element at the line with affected node

    const info = service.transformManager.findTransformInfoForOriginalFile(
      diagnostic.file.fileName
    );

    const position = service.pathUtils.offsetToPosition(changeTracker.original, diagnostic.start);
    const index = position.line;

    const isInHbsContext = this.shouldUseHbsComment(
      service.pathUtils,
      info,
      diagnostic.file.fileName,
      changeTracker.original,
      diagnostic,
      index
    );

    if (isInHbsContext) {
      // Abort trying to comment an hbs context until https://github.com/rehearsal-js/rehearsal-js/issues/1119 is resolved
      // For now, we DO NOT WANT add any {{! @glint-expect-errors }} directives in hbs contexts.
      return;
    }

    const message = `${commentTag} TODO TS${diagnostic.code}: ${hint}`;

    const tsIgnoreCommentText = isInHbsContext
      ? `@glint-expect-error ${message}`
      : `@ts-expect-error ${message}`;

    const lineAndChar = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);

    /**
     * The following logic has been ported from  https://github.com/airbnb/ts-migrate/blob/master/packages/ts-migrate-plugins/src/plugins/ts-ignore.ts#L199
     *
     * It correctly finds the valid place to stick the inline comment
     */
    if (!this.ignoreLines[lineAndChar.line]) {
      const commentLine = lineAndChar.line;
      const pos = ts.getPositionOfLineAndCharacter(diagnostic.file, commentLine, 0);

      let ws = '';
      let i = pos;
      while (diagnostic.file.text[i] === ' ') {
        i += 1;
        ws += ' ';
      }

      if (isInHbsContext) {
        changeTracker.appendRight(pos, `${ws}{{! ${tsIgnoreCommentText} }}${ts.sys.newLine}`);
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

  shouldUseHbsComment(
    pathUtils: PathUtils,
    info: TransformedInfo | null,
    filePath: string,
    fileContents: string,
    diagnostic: DiagnosticWithContext,
    startLine: number
  ): boolean {
    const module = info && info.transformedModule;

    if (module) {
      let template;

      // We must wrap this with a try catch because the findTemplateAtOriginalOffset will throw
      // on a template only conmponent with only a string and no logic or args.
      try {
        template = module.findTemplateAtOriginalOffset(filePath, diagnostic.start);
      } catch (e) {
        DEBUG_CALLBACK(
          `Unable to findTemplateAtOriginalOffset for ${diagnostic.code} with ${filePath}`
        );
        if (extname(filePath) === '.hbs') {
          return true;
        }
      }

      // If we're able to find a template associated with the diagnostic, then we know the error
      // is pointing to the body of a template, and we likely to use HBS comments
      if (template) {
        // If the template is *not* an HBS file, then it means we've encountered
        // either a <template> tag or an `hbs` invocation, in which case we need to be careful
        // where we insert hbs comments
        if (extname(filePath) === '.hbs') {
          return true;
        }

        const isMultiline = /\n/.test(template.originalContent);

        if (isMultiline) {
          // If the template is multiline, we check to see if the diagnostic occurs on the first
          // line or not. If it is on the first line, then we want to use `@ts-expect-error` since
          // the line above will be outside the template body. If the diagnostic points to a line
          // within the body of the template, then we should insert an hbs comment instead
          const templateStart = pathUtils.offsetToPosition(
            fileContents,
            template.originalContentStart
          );

          if (templateStart.line !== startLine) {
            return true;
          }
        }
      }
    }

    return false;
  }
}
