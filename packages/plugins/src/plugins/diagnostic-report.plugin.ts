import { DiagnosticWithContext, hints } from '@rehearsal/codefixes';
import { findNodeAtPosition } from '@rehearsal/ts-utils';
import debug from 'debug';
import ts from 'typescript';
import { PluginOptions, Plugin } from '../plugin.js';
import { getLocation } from '../helpers.js';
import { getBoundaryOfCommentBlock } from './utils.js';

import type { Service } from '@rehearsal/service';

const DEBUG_CALLBACK = debug('rehearsal:plugins:diagnostic-report');

export interface DiagnosticReportPluginOptions extends PluginOptions {
  addHints?: boolean;
  commentTag?: string;
}

export class DiagnosticReportPlugin extends Plugin<DiagnosticReportPluginOptions> {
  async run(): Promise<string[]> {
    const { fileName, context, options } = this;

    DEBUG_CALLBACK(`Plugin 'DiagnosticReport' run on %O:`, fileName);

    const originalContentWithErrorsSuppressed = context.service.getFileText(fileName);

    const lineHasSuppression: { [line: number]: boolean } = {};
    let contentWithErrors = originalContentWithErrorsSuppressed;
    const sourceFile = context.service.getSourceFile(fileName);
    const tagStarts = [...contentWithErrors.matchAll(new RegExp(options.commentTag!, 'g'))].map(
      (m) => m.index!
    );

    // Walk through all comments and remove the comments. IMPORTANT: We do not want to remove any lines as the document has
    // been formatted already.
    for (const tagStart of tagStarts.reverse()) {
      const commentSpan = context.service
        .getLanguageService()
        .getSpanOfEnclosingComment(sourceFile.fileName, tagStart, false);

      if (commentSpan === undefined) {
        continue;
      }

      // Remove comment, together with the {} that wraps around comments in React
      const boundary = getBoundaryOfCommentBlock(
        commentSpan.start,
        commentSpan.length,
        contentWithErrors
      );
      contentWithErrors =
        contentWithErrors.substring(0, boundary.start) +
        contentWithErrors.substring(boundary.end + 1);
    }

    // Our document now has unsuppressed errors in it. Set that content into the language server, so we can type check it
    context.service.setFileText(fileName, contentWithErrors);

    const diagnostics = this.getDiagnostics(context.service, fileName);

    for (const diagnostic of diagnostics) {
      const hint = hints.getHint(diagnostic).replace(context.basePath, '.');
      const helpUrl = hints.getHelpUrl(diagnostic);
      const location = getLocation(diagnostic.file, diagnostic.start, diagnostic.length);

      // We only allow for a single entry per line
      if (!lineHasSuppression[location.startLine]) {
        context.reporter.addTSItemToRun(
          diagnostic,
          diagnostic.node,
          location,
          hint,
          helpUrl,
          options.addHints
        );
        lineHasSuppression[location.startLine] = true;
      }
    }

    // We have now collected the correct line / cols of the errors. We can now set the document back to one without errors.
    context.service.setFileText(fileName, originalContentWithErrorsSuppressed);

    return Promise.resolve([]);
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

  isValidDiagnostic(diagnostic: DiagnosticWithContext): boolean {
    return !!diagnostic.node;
  }

  isErrorDiagnostic(diagnostic: DiagnosticWithContext): boolean {
    return diagnostic.category === ts.DiagnosticCategory.Error;
  }
}
