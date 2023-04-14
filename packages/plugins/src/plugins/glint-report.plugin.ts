import { DiagnosticWithContext, hints, getDiagnosticOrder } from '@rehearsal/codefixes';
import {
  GlintService,
  Plugin,
  PluginOptions,
  PluginsRunnerContext,
  Service,
  type PluginResult,
  PathUtils,
} from '@rehearsal/service';
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

export class GlintReportPlugin implements Plugin<PluginOptions> {
  async run(
    fileName: string,
    context: PluginsRunnerContext,
    options: GlintReportPluginOptions
  ): PluginResult {
    const service = context.service as GlintService;

    DEBUG_CALLBACK(`Plugin 'GlintReport' run on %O:`, fileName);

    const lineHasSupression: { [line: number]: boolean } = {};
    const originalConentWithErrorsSupressed = context.service.getFileText(fileName);

    let contentWithErrors = originalConentWithErrorsSupressed;

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

    // Our document now has unsupressed errors in it. Set that content into the langauge server so we can type check it
    service.setFileText(fileName, contentWithErrors);

    const diagnostics = this.getDiagnostics(service, fileName);

    for (const diagnostic of diagnostics) {
      const hint = hints.getHint(diagnostic).replace(context.basePath, '.');
      const helpUrl = hints.getHelpUrl(diagnostic);
      const location = getLocation(diagnostic.file, diagnostic.start, diagnostic.length);

      // We only allow for a single entry per line
      if (!lineHasSupression[location.startLine]) {
        context.reporter.addTSItemToRun(diagnostic, diagnostic.node, location, hint, helpUrl);
        lineHasSupression[location.startLine] = true;
      }
    }

    // Set the document back to the content with the errors supressed
    service.setFileText(fileName, originalConentWithErrorsSupressed);

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
