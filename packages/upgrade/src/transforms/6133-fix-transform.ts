import ts from 'typescript';

import { FixTransform, type FixResult } from '../interfaces/fix-transform';
import { getInitialResult, addCodemodDataToResult, getLocation } from '../helpers/transform-utils';

import { isSourceCodeChanged } from '../helpers/strings';
import { transformDiagnosedNode } from '../helpers/typescript-ast';

export class FixTransform6133 extends FixTransform {
  hint = `The declaration '{0}' is never read or used. Remove the declaration or use it.`;

  fix = (diagnostic: ts.DiagnosticWithLocation): FixResult => {
    let result = getInitialResult(diagnostic);

    const text = transformDiagnosedNode(diagnostic, (node: ts.Node) => {
      if (ts.isImportDeclaration(node) || ts.isImportSpecifier(node)) {
        // Remove all export declarations and undefined imported functions
        return undefined;
      } else if (ts.isIdentifier(node) && ts.isFunctionDeclaration(node.parent)) {
        this.hint = `The function '{0}' is never called. Remove the function or use it.`;
      } else if (ts.isIdentifier(node) && ts.isParameter(node.parent)) {
        this.hint = `The parameter '{0}' is never used. Remove the parameter from function definition or use it.`;
      } else if (ts.isIdentifier(node)) {
        this.hint = `The variable '{0}' is never read or used. Remove the variable or use it.`;
      }

      return node;
    });

    const hasChanged = isSourceCodeChanged(diagnostic.file.getFullText(), text);
    if (hasChanged) {
      const location = getLocation(diagnostic.file, diagnostic.start);
      result =  addCodemodDataToResult(result, diagnostic.file.fileName, text, '', ['deleted'], location);
      return result;
    }
    return result;
  };
}
