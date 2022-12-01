import {
  CodeFixAction,
  type DiagnosticWithLocation,
  getDefaultFormatCodeSettings,
  TextChange,
} from 'typescript';
import { applyTextChange, normalizeTextChanges } from '@rehearsal/utils';
import {
  type CodeFixAction as CodeFixKind,
  CodeFixCollection,
  type DiagnosticWithContext,
  FixedFile,
  FixTransform,
} from './types';

import { getCodemodData } from './utils';

export class TypescriptCodeFix extends FixTransform {
  readonly fixes;

  constructor(fixes: CodeFixAction[]) {
    super();
    this.fixes = fixes;
  }

  fix = (diagnostic: DiagnosticWithLocation): FixedFile[] => {
    let text = diagnostic.file.text;
    const fixedFiles = [];

    // TODO: Find a case where we can have more than one fix in the list
    // Do we need to use only the first (or selected) fix only? Seems applying them all can brake the source code
    for (const fix of this.fixes) {
      for (const fileTextChange of fix.changes) {
        // TODO: Support modification of other then affected files
        if (fileTextChange.fileName !== diagnostic.file.fileName) {
          continue;
        }

        const textChanges = normalizeTextChanges([...fileTextChange.textChanges]);

        for (const textChange of textChanges) {
          const originalText = text.substring(
            textChange.span.start,
            textChange.span.start + textChange.span.length
          );

          text = applyTextChange(text, textChange);

          // TODO Replace FixedFiles with FileTextChanges
          const fixedFile = this.convertTextChangeToFixedFile(
            diagnostic,
            textChange,
            text,
            originalText
          );
          if (fixedFile !== undefined) {
            fixedFiles.push(fixedFile);
          }
        }
      }
    }

    return fixedFiles;
  };

  convertTextChangeToFixedFile(
    diagnostic: DiagnosticWithLocation,
    textChange: TextChange,
    updatedText: string,
    originalText: string
  ): FixedFile | undefined {
    const getActionType = (textChange: TextChange): CodeFixKind => {
      if (textChange.span.length === 0) {
        return 'add';
      }

      if (textChange.newText === '') {
        return 'delete';
      }

      return 'replace';
    };
    const newCode = textChange.newText || '';
    const oldCode = originalText || '';

    return getCodemodData(
      diagnostic.file,
      updatedText,
      diagnostic.start,
      newCode,
      oldCode,
      getActionType(textChange)
    ).pop();
  }
}

/**
 * Provides code fixes based on the Typescript's codefix collection.
 * @see https://github.com/microsoft/TypeScript/tree/main/src/services/codefixes
 */
export class TypescriptCodeFixCollection implements CodeFixCollection {
  getFixForDiagnostic(diagnostic: DiagnosticWithContext): FixTransform | undefined {
    const languageService = diagnostic.service;

    const formatOptions = getDefaultFormatCodeSettings();
    const userPreferences = {};

    const fixes = languageService.getCodeFixesAtPosition(
      diagnostic.file.fileName,
      diagnostic.start,
      diagnostic.start + diagnostic.length,
      [diagnostic.code],
      formatOptions,
      userPreferences
    );

    if (fixes.length === 0) {
      return undefined;
    }

    return new TypescriptCodeFix([...fixes]);
  }
}
