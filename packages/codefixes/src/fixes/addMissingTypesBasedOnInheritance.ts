import { ChangesFactory } from '@rehearsal/ts-utils';
import ts from 'typescript';
import { createCodeFixAction } from '../hints-codefix-collection.js';
import { Diagnostics } from '../diagnosticInformationMap.generated.js';
import type { CodeFix, DiagnosticWithContext } from '../types.js';
import type {
  CodeFixAction,
  MethodDeclaration,
  ParameterDeclaration,
  Signature,
  TypeChecker,
} from 'typescript';

const { findAncestor, isClassDeclaration, isMethodDeclaration, isParameter } = ts;

type TypeFinder = (ancestorMethodSignature: Signature, checker: TypeChecker) => string | undefined;

export class AddMissingTypesBasedOnInheritanceCodeFix implements CodeFix {
  getErrorCodes = (): number[] => [Diagnostics.TS7006.code, Diagnostics.TS7050.code];

  getCodeAction(diagnostic: DiagnosticWithContext): CodeFixAction | undefined {
    if (!diagnostic.node) {
      return undefined;
    }

    if (isParameter(diagnostic.node)) {
      return this.fixMissingParameterType(diagnostic);
    }

    if (isMethodDeclaration(diagnostic.node)) {
      return this.fixMissingReturnType(diagnostic);
    }

    return undefined;
  }

  private fixMissingReturnType(diagnostic: DiagnosticWithContext): CodeFixAction | undefined {
    const node = diagnostic.node as MethodDeclaration;
    const typeFinder: TypeFinder = (ancestorSignature, checker) => {
      return checker.typeToString(ancestorSignature.getReturnType());
    };

    const returnType = this.findInheritedType(node, diagnostic.checker, typeFinder);

    if (!returnType) {
      return undefined;
    }

    const closeParen = node
      .getChildren()
      .find((node) => node.kind == ts.SyntaxKind.CloseParenToken);

    // Only named methods are supported
    if (!closeParen) {
      return undefined;
    }

    return createCodeFixAction(
      'addMissingTypeBasedOnInheritance',
      [ChangesFactory.insertText(diagnostic.file, closeParen.getEnd() + 1, `: ${returnType} `)],
      'Add the missing return type based on inheritance'
    );
  }

  private fixMissingParameterType(diagnostic: DiagnosticWithContext): CodeFixAction | undefined {
    const node = diagnostic.node as ParameterDeclaration;
    const currentMethod = findAncestor(node, isMethodDeclaration);

    if (!currentMethod) {
      return undefined;
    }

    const currentParameterIndex = currentMethod.parameters.findIndex(
      (p) => p.name.getText() === node.name.getText()
    );

    const typeFinder: TypeFinder = (ancestorMethodSignature, checker) => {
      const parameterSymbol = ancestorMethodSignature.parameters[currentParameterIndex];

      // Additional parameter in a child function won't have param in parent function signature
      if (!parameterSymbol || !parameterSymbol.valueDeclaration) {
        return undefined;
      }

      return checker.typeToString(
        checker.getTypeOfSymbolAtLocation(parameterSymbol, parameterSymbol.valueDeclaration)
      );
    };

    const paramType = this.findInheritedType(currentMethod, diagnostic.checker, typeFinder);

    if (!paramType) {
      return undefined;
    }

    return createCodeFixAction(
      'addMissingTypeBasedOnInheritance',
      [ChangesFactory.insertText(diagnostic.file, node.getEnd(), `: ${paramType}`)],
      'Add the missing type based on inheritance'
    );
  }

  private findInheritedType(
    methodDeclaration: MethodDeclaration,
    checker: TypeChecker,
    finder: TypeFinder
  ): string | undefined {
    const currentClass = findAncestor(methodDeclaration, isClassDeclaration);

    // Check if the method declaration is inside a class extends another class
    if (!currentClass || !currentClass.heritageClauses) {
      return undefined;
    }

    // Walk over `extends` and `implements`
    for (const heritageClause of currentClass.heritageClauses) {
      // Walk over inherited and implemented classes
      for (const heritageClauseTypeNode of heritageClause.types) {
        // Search for a function symbol with the same name
        const ancestorMethodSymbol = checker
          .getTypeAtLocation(heritageClauseTypeNode)
          .getProperty(methodDeclaration.name.getText());

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

        const type = finder(ancestorMethodCallSignatures[0], checker);

        // Skipping "non-strict types"
        if (!type || type === 'any' || type === 'object') {
          // If the type was too loose, but we have an ancestor of the current class
          // recurse with the parent
          const parentClassMethod = findAncestor(
            ancestorMethodSymbol.declarations?.[0],
            isMethodDeclaration
          );

          if (parentClassMethod) {
            return this.findInheritedType(parentClassMethod, checker, finder);
          }

          continue;
        }

        return type;
      }
    }

    return undefined;
  }
}
