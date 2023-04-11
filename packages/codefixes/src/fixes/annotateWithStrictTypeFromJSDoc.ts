import { canTypeBeResolved, findNodeEndsAtPosition } from '@rehearsal/ts-utils';
import ts from 'typescript';
import { Diagnostics } from '../diagnosticInformationMap.generated.js';
import { TypescriptCodeFixCollection } from '../typescript-codefix-collection.js';
import type { FileTextChanges, TextChange, CodeFixAction } from 'typescript';
import type { CodeFix, DiagnosticWithContext } from '../types.js';

const {
  isFunctionDeclaration,
  isMethodDeclaration,
  isPropertyDeclaration,
  isVariableDeclaration,
  getJSDocType,
} = ts;

export class AnnotateWithStrictTypeFromJSDoc implements CodeFix {
  getErrorCodes = (): number[] => [Diagnostics.TS80004.code];

  getCodeAction(diagnostic: DiagnosticWithContext): CodeFixAction | undefined {
    const tsCollection = new TypescriptCodeFixCollection();

    const fix = tsCollection
      .getFixesForDiagnostic(diagnostic, {
        safeFixes: false,
        strictTyping: true,
      })
      .find((fix) => fix.fixName === 'annotateWithTypeFromJSDoc');

    if (!fix || !diagnostic.node) {
      return undefined;
    }

    if (
      isFunctionDeclaration(diagnostic.node.parent) ||
      isMethodDeclaration(diagnostic.node.parent) ||
      isPropertyDeclaration(diagnostic.node.parent) ||
      isVariableDeclaration(diagnostic.node.parent)
    ) {
      return this.filterFunctionParams(fix, diagnostic);
    }

    return fix;
  }

  filterFunctionParams(
    fix: CodeFixAction,
    diagnostic: DiagnosticWithContext
  ): CodeFixAction | undefined {
    const safeChanges: FileTextChanges[] = [];
    for (const changes of fix.changes) {
      const safeTextChanges: TextChange[] = [];
      for (const textChanges of changes.textChanges) {
        const node = findNodeEndsAtPosition(diagnostic.file, textChanges.span.start);

        if (node) {
          const typeNode = getJSDocType(node) || getJSDocType(node.parent);

          if (typeNode && !canTypeBeResolved(diagnostic.checker, typeNode)) {
            continue;
          }
        }

        safeTextChanges.push(textChanges);
      }

      if (safeTextChanges.length) {
        safeChanges.push({ ...changes, textChanges: safeTextChanges });
      }
    }

    if (safeChanges.length) {
      return { ...fix, changes: safeChanges };
    }

    return undefined;
  }
}
