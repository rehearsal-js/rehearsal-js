import { canTypeBeResolved, findNodeEndsAtPosition } from '@rehearsal/ts-utils';
import ts, { FormatCodeSettings } from 'typescript';
import { Diagnostics } from '../diagnosticInformationMap.generated.js';
// import { TypescriptCodeFixCollection } from '../typescript-codefix-collection.js';
import { TypescriptCodeFixCollection } from '../typescript-codefix-collection.js';
import { GlintCodeFixCollection, GlintDiagnosticWithContext } from '../glint-codefix-collection.js';
import type { FileTextChanges, TextChange, CodeFixAction } from 'typescript';
import type { CodeFix, CodeFixCollection, DiagnosticWithContext } from '../types.js';

const {
  isFunctionDeclaration,
  isMethodDeclaration,
  isParameter,
  isPropertyDeclaration,
  isVariableDeclaration,
  getJSDocParameterTags,
  getJSDocReturnType,
  getJSDocType,
} = ts;

function isGlintDiagnosticWithContext(
  diagnostic: unknown
): diagnostic is GlintDiagnosticWithContext {
  return !!diagnostic && Object.hasOwnProperty.call(diagnostic, 'glintService');
}

export class AnnotateWithStrictTypeFromJSDoc implements CodeFix {
  getErrorCodes = (): number[] => [Diagnostics.TS80004.code];

  getCodeFixCollection(diagnostic: DiagnosticWithContext): CodeFixCollection {
    return isGlintDiagnosticWithContext(diagnostic)
      ? new GlintCodeFixCollection()
      : new TypescriptCodeFixCollection();
  }

  getCodeAction(
    diagnostic: DiagnosticWithContext,
    formatSettings: FormatCodeSettings
  ): CodeFixAction | undefined {
    const codeFixCollection = this.getCodeFixCollection(diagnostic);

    // If this fails we may need to wrap this with a try/catch
    // Currently we don't know of a test case that would cause
    // this to fail.
    const fix = codeFixCollection
      .getFixesForDiagnostic(
        diagnostic,
        {
          safeFixes: false,
          strictTyping: true,
        },
        formatSettings
      )
      .find(
        (fix) =>
          fix.fixName === 'annotateWithTypeFromJSDoc' ||
          fix.description === 'Annotate with type from JSDoc' // Glint does not use the fixName, it uses description
      );

    if (!fix || !diagnostic.node) {
      return undefined;
    }

    if (
      isFunctionDeclaration(diagnostic.node.parent) ||
      isMethodDeclaration(diagnostic.node.parent) ||
      isPropertyDeclaration(diagnostic.node.parent) ||
      isVariableDeclaration(diagnostic.node.parent)
    ) {
      return this.filterUnresolvedTypes(fix, diagnostic);
    }

    return fix;
  }

  filterUnresolvedTypes(
    fix: CodeFixAction,
    diagnostic: DiagnosticWithContext
  ): CodeFixAction | undefined {
    const safeChanges: FileTextChanges[] = [];
    for (const changes of fix.changes) {
      const safeTextChanges: TextChange[] = [];
      for (const textChanges of changes.textChanges) {
        const node = this.findTargetNode(textChanges.span.start, diagnostic);
        if (node) {
          const typeNode = this.findTargetJSDocType(node);

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

  findTargetNode(
    positionToAddType: number,
    diagnostic: DiagnosticWithContext
  ): ts.Node | undefined {
    const braces = diagnostic.service.getBraceMatchingAtPosition(
      diagnostic.file.fileName,
      positionToAddType - 1
    );
    if (braces.length) {
      return findNodeEndsAtPosition(diagnostic.file, braces[0].start);
    }

    return findNodeEndsAtPosition(diagnostic.file, positionToAddType);
  }

  findTargetJSDocType(node: ts.Node): ts.TypeNode | undefined {
    /*
     TypeScript's parser incorrectly parses JSDoc in some cases (nodes have wrong `kind` value)
     that causing "Cannot read properties of undefined (reading 'kind')" issue
     the `try ... catch` is to handle those cases
     */
    try {
      if (isMethodDeclaration(node.parent) || isFunctionDeclaration(node.parent)) {
        return getJSDocReturnType(node.parent);
      }

      if (isParameter(node.parent)) {
        return getJSDocParameterTags(node.parent).find(
          (tag) => tag.name.getText() === node.getText()
        )?.typeExpression?.type;
      }

      return getJSDocType(node) || getJSDocType(node.parent);
    } catch (_) {
      return undefined;
    }
  }
}
