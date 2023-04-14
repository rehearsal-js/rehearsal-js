import { extname } from 'node:path';
import { type TransformManager } from '@glint/core';
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
import { getLocation } from '../helpers.js';

export interface GlintReportPluginOptions extends PluginOptions {
  commentTag: string;
}

type TransformedInfo = NonNullable<
  ReturnType<TransformManager['findTransformInfoForOriginalFile']>
>;

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
    const diagnostics = this.getDiagnostics(service, fileName);

    if (!diagnostics.length) {
      return [];
    }

    const fixedFiles: Set<string> = new Set();

    const numDiagnostics = diagnostics.length;

    diagnostics.reverse().forEach((diagnostic, index) => {
      const hint = hints.getHint(diagnostic).replace(context.basePath, '.');
      const helpUrl = hints.getHelpUrl(diagnostic);

      const updatedText = this.insertTodo(service, diagnostic, hint, options.commentTag);

      const fileName = diagnostic.file.fileName;
      context.service.setFileText(fileName, updatedText);

      const location = diagnostic.location;
      // Since each TODO comment adds a line to the file, we calculate an offset that takes into
      // account the number of comments already added (index) subtracted from the number of
      // diagnostics (to account for the fact that we reverse the diagnostic list) and subtracting
      // 1 to account for the additional line added by `getLocation`
      const locationOffset = numDiagnostics - index - 1;
      location.startLine += locationOffset;
      location.endLine += locationOffset;

      context.reporter.addTSItemToRun(diagnostic, undefined, location, hint, helpUrl);
      fixedFiles.add(fileName);
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

  insertTodo(
    service: GlintService,
    diagnostic: DiagnosticWithContext,
    hint: string,
    commentTag: string
  ): string {
    const filePath = diagnostic.file.fileName;
    const fileContents = service.getFileText(filePath);
    const lines = fileContents.split('\n');
    const info = service.transformManager.findTransformInfoForOriginalFile(filePath);
    const start = service.pathUtils.offsetToPosition(fileContents, diagnostic.start);
    const index = start.line;

    const useHbsComment = this.shouldUseHbsComment(
      service.pathUtils,
      info,
      filePath,
      fileContents,
      diagnostic,
      index
    );

    const [leadingWhitespace, indentation] = /^\s*\n?(\s*)/.exec(lines[index]) ?? ['', ''];
    const message = `${commentTag} TODO TS${diagnostic.code}: ${hint}`;

    const todo = useHbsComment
      ? `${leadingWhitespace}{{! @glint-expect-error ${message} }}${indentation}`
      : `${leadingWhitespace}/* @ts-expect-error ${message} */${indentation}`;

    lines.splice(index, 0, todo);

    return lines.join('\n');
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
      const template = module.findTemplateAtOriginalOffset(filePath, diagnostic.start);
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
