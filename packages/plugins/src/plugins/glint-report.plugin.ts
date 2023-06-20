import { DiagnosticWithContext, hints, getDiagnosticOrder } from '@rehearsal/codefixes';
import { GlintService, PluginOptions, Service, Plugin } from '@rehearsal/service';
import { type Location } from '@rehearsal/reporter';
import debug from 'debug';
import ts from 'typescript';
import { getLocation } from '../helpers.js';

const DEBUG_CALLBACK = debug('rehearsal:plugins:glint-report');

export interface GlintReportPluginOptions extends PluginOptions {
  commentTag: string;
}

export interface DiagnosticWithLocation extends DiagnosticWithContext {
  location: Location;
}

export class GlintReportPlugin extends Plugin<GlintReportPluginOptions> {
  async run(): Promise<string[]> {
    const { fileName, context, options } = this;
    const service = context.service as GlintService;

    DEBUG_CALLBACK(`Plugin 'GlintReport' run on %O:`, fileName);

    const lineHasSupression: { [line: number]: boolean } = {};
    const originalContentWithErrorsSuppressed = context.service.getFileText(fileName);

    let contentWithErrors = originalContentWithErrorsSuppressed;

    // TODO: Investigate if there is a better way of finding the ranges using the actual
    // ast instead of regexing
    const tsExpectErrorRegex = new RegExp(
      `//\\s*@ts-expect-error\\s.*${options.commentTag}\\s.*$`,
      'gm'
    );
    const glintExpectErrorRegex = new RegExp(
      `{{!\\s*@glint-expect-error\\s.*${options.commentTag}\\s.*}}$`,
      'gm'
    );
    const comments = [
      ...contentWithErrors.matchAll(tsExpectErrorRegex),
      ...contentWithErrors.matchAll(glintExpectErrorRegex),
    ].map((comment) => ({
      start: comment.index!,
      end: comment.index! + comment[0].length,
    }));

    for (const comment of comments.reverse()) {
      // remove the comment
      contentWithErrors =
        contentWithErrors.substring(0, comment.start) + contentWithErrors.substring(comment.end);
    }

    // Our document now has unsuppressed errors in it. Set that content into the langauge server so we can type check it
    service.setFileText(fileName, contentWithErrors);

    const diagnostics = this.getDiagnostics(service, fileName);

    for (const diagnostic of diagnostics) {
      const hint = hints.getHint(diagnostic).replace(context.basePath, '.');
      const helpUrl = hints.getHelpUrl(diagnostic);
      const location = getLocation(diagnostic.file, diagnostic.start, diagnostic.length);

      // We only allow for a single entry per line
      if (!lineHasSupression[location.startLine]) {
        if (diagnostic.source === 'glint') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          context.reporter.addGlintItemToRun(diagnostic, diagnostic.node, location, hint, helpUrl);
        } else {
          context.reporter.addTSItemToRun(diagnostic, diagnostic.node, location, hint, helpUrl);
        }
        lineHasSupression[location.startLine] = true;
      }
    }

    // Set the document back to the content with the errors suppressed
    service.setFileText(fileName, originalContentWithErrorsSuppressed);

    return Promise.resolve([]);
  }

  getDiagnostics(service: Service, fileName: string): DiagnosticWithLocation[] {
    const languageService = service.getLanguageService();
    const program = languageService.getProgram()!;
    const checker = program.getTypeChecker();

    const diagnostics = getDiagnosticOrder(service.getDiagnostics(fileName)).filter((d) =>
      this.isErrorDiagnostic(d)
    );

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

  isErrorDiagnostic(diagnostic: ts.DiagnosticWithLocation): boolean {
    return diagnostic.category === ts.DiagnosticCategory.Error;
  }
}
