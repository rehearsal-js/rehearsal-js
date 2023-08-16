import { ChangesFactory } from '@rehearsal/ts-utils';
import ts from 'typescript';
import { createCodeFixAction } from '../hints-codefix-collection.js';
import { Diagnostics } from '../diagnosticInformationMap.generated.js';
import type { CodeFix, DiagnosticWithContext } from '../types.js';
import type { CodeFixAction } from 'typescript';

const { isMethodDeclaration, isFunctionDeclaration } = ts;

export class AddMissingTypesBasedOnInlayHintsCodeFix implements CodeFix {
  getErrorCodes = (): number[] => [Diagnostics.TS7050.code];

  getCodeAction(diagnostic: DiagnosticWithContext): CodeFixAction | undefined {
    if (
      diagnostic.node === undefined ||
      !(isFunctionDeclaration(diagnostic.node) || isMethodDeclaration(diagnostic.node)) ||
      diagnostic.node.name === undefined
    ) {
      return undefined;
    }

    const closeParen = diagnostic.node
      .getChildren()
      .find((node) => node.kind == ts.SyntaxKind.CloseParenToken);
    if (!closeParen) {
      return undefined;
    }

    const targetPosition = closeParen.getEnd();

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
      'addMissingTypeBasedOnInlayHint',
      [ChangesFactory.insertText(diagnostic.file, hint.position, `${hint.text} `)],
      'Add the missing type based on inlay hint'
    );
  }
}
