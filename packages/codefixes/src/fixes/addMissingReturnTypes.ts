import { ChangesFactory, getPositionFromClosingParen } from '@rehearsal/ts-utils';
import ts from 'typescript';
import { createCodeFixAction } from '../hints-codefix-collection.js';
import { Diagnostics } from '../diagnosticInformationMap.generated.js';
import type { CodeFix, DiagnosticWithContext } from '../types.js';
import type { CodeFixAction } from 'typescript';

const { isFunctionLike } = ts;
export class AddMissingReturnTypesCodeFix implements CodeFix {
  getErrorCodes = (): number[] => [Diagnostics.TS7050.code];

  getCodeAction(diagnostic: DiagnosticWithContext): CodeFixAction | undefined {
    if (
      diagnostic.node === undefined ||
      !isFunctionLike(diagnostic.node) ||
      diagnostic.node.name === undefined
    ) {
      return undefined;
    }

    // Find closing parent of function arguments
    const targetPosition = getPositionFromClosingParen(diagnostic.node);

    if (!targetPosition) {
      return undefined;
    }

    //let typeToString: string;

    // In some cases for .gts files with methods with `...args` it will fail
    // due to a missing symbol on a parameter.

    const signature = diagnostic.checker.getSignatureFromDeclaration(diagnostic.node);

    if (!signature) {
      return;
    }

    const returnType = diagnostic.checker.getReturnTypeOfSignature(signature);

    if (!returnType) {
      return;
    }

    const typeToString = diagnostic.checker.typeToString(returnType);

    if (!typeToString || typeToString.includes('any') || typeToString.includes('object')) {
      return undefined;
    }

    return createCodeFixAction(
      'addMissingReturnType',
      [ChangesFactory.insertText(diagnostic.file, targetPosition, `: ${typeToString}`)],
      'Add the missing return type based on inlay hint'
    );
  }
}
