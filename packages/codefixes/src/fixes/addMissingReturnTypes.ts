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

    let typeToString: string;

    // In some cases for .gts files with methods with `...args` it will fail
    // due to a missing symbol on a parameter.
    try {
      const signature = diagnostic.checker.getSignatureFromDeclaration(diagnostic.node);

      if (!signature) {
        return;
      }

      const returnType = diagnostic.checker.getReturnTypeOfSignature(signature);

      if (!returnType) {
        return;
      }

      typeToString = diagnostic.checker.typeToString(returnType);
    } catch (error) {
      // Fallback to inlay hints if unable to determine return type of signature
      return this.fixMissingReturnTypeWithInlayHints(diagnostic, targetPosition);
    }

    if (!typeToString || typeToString.includes('any') || typeToString.includes('object')) {
      return undefined;
    }

    return createCodeFixAction(
      'addMissingReturnType',
      [ChangesFactory.insertText(diagnostic.file, targetPosition, `: ${typeToString}`)],
      'Add the missing return type based on inlay hint'
    );
  }

  fixMissingReturnTypeWithInlayHints(
    diagnostic: DiagnosticWithContext,
    targetPosition: number
  ): CodeFixAction | undefined {
    if (
      !diagnostic.node ||
      !isFunctionLike(diagnostic.node) ||
      diagnostic.node.name === undefined
    ) {
      return undefined;
    }

    // TODO: Remove this hack for Glint's .gts files to be processed as .ts
    // The Glint's `program` doesn't know about .gts and represents them as .ts files under the hood
    const fileName = diagnostic.file.fileName.replace(/.gts$/, '.ts');

    const hints = diagnostic.service.provideInlayHints(
      fileName,
      {
        start: targetPosition,
        length: targetPosition + 1,
      },
      {
        includeInlayParameterNameHintsWhenArgumentMatchesName: true,
        includeInlayFunctionParameterTypeHints: true,
        includeInlayVariableTypeHints: true,
        includeInlayVariableTypeHintsWhenTypeMatchesName: true,
        includeInlayPropertyDeclarationTypeHints: true,
        includeInlayFunctionLikeReturnTypeHints: true,
      }
    );

    const hint = hints.find(
      (hint) => hint.position >= targetPosition && hint.position <= targetPosition + 1
    );

    if (
      !hint ||
      hint.text.includes('any') ||
      hint.text.includes('object') ||
      // Some hints will be truncated with three periods not ellipsis character.
      // This can break syntax if injected.
      hint.text.includes('...')
    ) {
      return undefined;
    }

    return createCodeFixAction(
      'addMissingReturnType',
      [ChangesFactory.insertText(diagnostic.file, hint.position, `${hint.text} `)],
      'Add the missing type based on inlay hint'
    );
  }
}
