import { ChangesFactory, findNodeAtPosition } from '@rehearsal/utils';
import { findAncestor, isClassDeclaration, isMethodDeclaration, isParameter } from 'typescript';
import { createCodeFixAction } from '../../hints-codefix-collection.js';
import type { CodeFixAction } from 'typescript';
import type { CodeFix, DiagnosticWithContext } from '../../types.js';

export class AddMissingTypesBasedOnInheritanceCodeFix implements CodeFix {
  getCodeAction(diagnostic: DiagnosticWithContext): CodeFixAction | undefined {
    const node = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);

    // Support only function params
    if (!node || !isParameter(node)) {
      return undefined;
    }
    const currentClass = findAncestor(node, isClassDeclaration);
    const currentMethod = findAncestor(node, isMethodDeclaration);

    // Method declaration inside class extends another class
    if (!currentMethod || !currentClass || !currentClass.heritageClauses) {
      return undefined;
    }

    const currentParameterIndex = currentMethod.parameters.findIndex(
      (p) => p.name.getText() === node.name.getText()
    );

    const checker = diagnostic.checker;

    // Walk over `extends` and `implements`
    for (const heritageClause of currentClass.heritageClauses) {
      // Walk over inherited and implemented classes
      for (const heritageClauseTypeNode of heritageClause.types) {
        // Search for a function symbol with the same name
        const ancestorMethodSymbol = checker
          .getTypeAtLocation(heritageClauseTypeNode)
          .getProperty(currentMethod.name.getText());

        if (!ancestorMethodSymbol || !ancestorMethodSymbol.valueDeclaration) {
          continue;
        }

        const ancestorMethodCallSignatures = checker
          .getTypeOfSymbolAtLocation(ancestorMethodSymbol, ancestorMethodSymbol.valueDeclaration)
          .getCallSignatures();

        // Don't support multiple signatures
        if (ancestorMethodCallSignatures.length !== 1) {
          continue;
        }

        const parameterSymbol = ancestorMethodCallSignatures[0].parameters[currentParameterIndex];

        // Additional parameter in a child function won't have param in parent function signature
        if (!parameterSymbol || !parameterSymbol.valueDeclaration) {
          continue;
        }

        const type = checker.typeToString(
          checker.getTypeOfSymbolAtLocation(parameterSymbol, parameterSymbol.valueDeclaration)
        );

        if (!type || type === 'any' || type === 'object') {
          continue;
        }

        return createCodeFixAction(
          'addMissingTypeBasedOnInheritance',
          [ChangesFactory.insertText(diagnostic.file, node.getEnd(), `: ${type}`)],
          'Add the missing type based on inheritance'
        );
      }
    }

    return undefined;
  }
}
