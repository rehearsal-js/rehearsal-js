import { ChangesFactory, getPositionFromClosingParen } from '@rehearsal/ts-utils';
import ts from 'typescript';
import { createCodeFixAction } from '../hints-codefix-collection.js';
import { Diagnostics } from '../diagnosticInformationMap.generated.js';
import type { CodeFix, DiagnosticWithContext } from '../types.js';
import type { CodeFixAction } from 'typescript';

const { isMethodDeclaration, isFunctionDeclaration } = ts;

export class AddMissingReturnTypesCodeFix implements CodeFix {
  getErrorCodes = (): number[] => [Diagnostics.TS7050.code];

  getCodeAction(diagnostic: DiagnosticWithContext): CodeFixAction | undefined {
    if (
      diagnostic.node === undefined ||
      !(isFunctionDeclaration(diagnostic.node) || isMethodDeclaration(diagnostic.node)) ||
      diagnostic.node.name === undefined
    ) {
      return undefined;
    }

    // Find closing parent of function arguments
    const targetPosition = getPositionFromClosingParen(diagnostic.node);

    if (!targetPosition) {
      return undefined;
    }

    const signature = diagnostic.checker.getSignatureFromDeclaration(diagnostic.node);

    if (!signature) {
      return;
    }

    const returnType = diagnostic.checker.getReturnTypeOfSignature(signature);
    const typeToString = diagnostic.checker.typeToString(returnType);

    if (!typeToString || typeToString.includes('any') || typeToString.includes('object')) {
      return undefined;
    }

    return createCodeFixAction(
      'addMissingTypeBasedOnInlayHint',
      [ChangesFactory.insertText(diagnostic.file, targetPosition, `: ${typeToString}`)],
      'Add the missing return type'
    );
  }
}
