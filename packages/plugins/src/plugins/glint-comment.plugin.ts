import { extname } from 'node:path';
import { pathUtils, type TransformManager } from '@glint/core';
import { DiagnosticWithContext, hints, getDiagnosticOrder } from '@rehearsal/codefixes';
import {
  GlintService,
  Plugin,
  PluginOptions,
  PluginsRunnerContext,
  Service,
  type PluginResult,
} from '@rehearsal/service';
import { type Location } from '@rehearsal/reporter';
import MagicString from 'magic-string';
import { getLocation } from '../helpers.js';

export interface GlintCommentPluginOptions extends PluginOptions {
  commentTag: string;
}

type TransformedInfo = NonNullable<
  ReturnType<TransformManager['findTransformInfoForOriginalFile']>
>;

export interface DiagnosticWithLocation extends DiagnosticWithContext {
  location: Location;
}

export class GlintCommentPlugin implements Plugin<PluginOptions> {
  changeTrackers: Map<string, MagicString.default> = new Map();
  async run(
    fileName: string,
    context: PluginsRunnerContext,
    options: GlintCommentPluginOptions
  ): PluginResult {
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
        const changeTracker: MagicString.default = new MagicString.default(originalText);

        this.changeTrackers.set(diagnostic.file.fileName, changeTracker);
      }

      const hint = hints.getHint(diagnostic).replace(context.basePath, '.');
      this.insertTodo(service, diagnostic, hint, options.commentTag);
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

  insertTodo(
    service: GlintService,
    diagnostic: DiagnosticWithContext,
    hint: string,
    commentTag: string
  ): void {
    const filePath = diagnostic.file.fileName;
    const changeTracker = this.changeTrackers.get(filePath);

    if (!changeTracker) {
      throw new Error('Invariant');
    }

    const info = service.transformManager.findTransformInfoForOriginalFile(filePath);
    const position = pathUtils.offsetToPosition(changeTracker.original, diagnostic.start);
    const index = position.line;
    const head = changeTracker.slice(0, position.character);

    const useHbsComment = this.shouldUseHbsComment(
      info,
      filePath,
      changeTracker.original,
      diagnostic,
      index
    );

    const message = `${commentTag} TODO TS${diagnostic.code}: ${hint}`;

    const todo = useHbsComment
      ? `{{! @glint-expect-error ${message} }}`
      : `/* @ts-expect-error ${message} */`;

    changeTracker.update(position.character, position.character + todo.length, todo);
    changeTracker.update(0, position.character, head);
  }

  shouldUseHbsComment(
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
