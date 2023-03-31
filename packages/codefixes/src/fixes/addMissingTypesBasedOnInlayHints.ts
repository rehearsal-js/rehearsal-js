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

    const closeParen = diagnostic.node.getChildren().find((node) => node.kind == 21);
    if (!closeParen) {
      return undefined;
    }

    const targetPosition = closeParen.getEnd();

    const hints = diagnostic.service.provideInlayHints(
      diagnostic.file.fileName,
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

    if (!hint || hint.text.includes('any') || hint.text.includes('object')) {
      return undefined;
    }

    return createCodeFixAction(
      'addMissingTypeBasedOnInlayHint',
      [ChangesFactory.insertText(diagnostic.file, hint.position, `${hint.text} `)],
      'Add the missing type based on inlay hint'
    );
  }
}
