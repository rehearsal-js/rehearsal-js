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
import ts from 'typescript';
import { getLocation } from '../helpers.js';

const { isLineBreak } = ts;

const DEBUG_CALLBACK = debug('rehearsal:plugins:diagnostic-report');

export interface DiagnosticReportPluginOptions extends PluginOptions {
  addHints?: boolean;
  commentTag?: string;
}

export class DiagnosticReportPlugin implements Plugin<DiagnosticReportPluginOptions> {
  async run(
    fileName: string,
    context: PluginsRunnerContext,
    options: DiagnosticReportPluginOptions
  ): PluginResult {
    options.addHints ??= true;
    options.commentTag ??= `@rehearsal`;

    DEBUG_CALLBACK(`Plugin 'DiagnosticReport' run on %O:`, fileName);

    const originalConentWithErrorsSupressed = context.service.getFileText(fileName);

    const lineHasSupression: { [line: number]: boolean } = {};
    let contentWithErrors = originalConentWithErrorsSupressed;
    const sourceFile = context.service.getSourceFile(fileName);
    const tagStarts = [...contentWithErrors.matchAll(new RegExp(options.commentTag, 'g'))].map(
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
      const boundary = this.getBoundaryOfCommentBlock(
        commentSpan.start,
        commentSpan.length,
        contentWithErrors
      );
      contentWithErrors =
        contentWithErrors.substring(0, boundary.start) + contentWithErrors.substring(boundary.end);
    }

    // Our document now has unsupressed errors in it. Set that content into the langauge server so we can type check it
    context.service.setFileText(fileName, contentWithErrors);

    const diagnostics = this.getDiagnostics(context.service, fileName);

    for (const diagnostic of diagnostics) {
      const hint = hints.getHint(diagnostic).replace(context.basePath, '.');
      const helpUrl = hints.getHelpUrl(diagnostic);
      const location = getLocation(diagnostic.file, diagnostic.start, diagnostic.length);

      // We only allow for a single entry per line
      if (!lineHasSupression[location.startLine]) {
        context.reporter.addTSItemToRun(
          diagnostic,
          diagnostic.node,
          location,
          hint,
          helpUrl,
          options.addHints
        );
        lineHasSupression[location.startLine] = true;
      }
    }

    // We have now collected the correct line / cols of the errors. We can now set the document back to one without errors.
    context.service.setFileText(fileName, originalConentWithErrorsSupressed);

    return Promise.resolve([]);
  }

  getBoundaryOfCommentBlock(
    start: number,
    length: number,
    text: string
  ): { start: number; end: number } {
    const newStart = start - 1 >= 0 && text[start - 1] === '{' ? start - 1 : start;

    let end = start + length - 1;

    end = end + 1 < text.length && text[end + 1] === '}' ? end + 1 : end;
    end = isLineBreak(text.charCodeAt(end + 1)) ? end + 1 : end;

    return {
      start: newStart,
      end,
    };
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
