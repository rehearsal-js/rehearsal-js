import ts from 'typescript';

import FixTransform, { FixedFile } from '../interfaces/fix-transform';
import { isSourceCodeChanged } from '../helpers/strings';
import { transformDiagnosedNode, findNodeAtPosition } from '../helpers/typescript-ast';

export default class FixTransform6133 extends FixTransform {
  getHint = (replacements: { [key: string]: string }, diagnostic: ts.DiagnosticWithLocation) => {
    const values = Object.values(replacements);
    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
    if (!errorNode || values.length < 1) {
      return undefined;
    }

    const { '{0}': name } = replacements;
    let hint = `The declaration '${name}' is never read or used. Remove the declaration or use it.`;

    if (ts.isIdentifier(errorNode) && ts.isFunctionDeclaration(errorNode.parent)) {
      hint = `The function '${name}' is never called. Remove the function or use it.`;
    } else if (ts.isIdentifier(errorNode) && ts.isParameter(errorNode.parent)) {
      hint = `The parameter '${name}' is never used. Remove the parameter from function definition or use it.`;
    } else if (ts.isIdentifier(errorNode)) {
      hint = `The variable '${name}' is never read or used. Remove the variable or use it.`;
    }
    return hint;
  };

  fix = (diagnostic: ts.DiagnosticWithLocation): FixedFile[] => {
    const text = transformDiagnosedNode(diagnostic, (node: ts.Node) => {
      if (ts.isImportDeclaration(node) || ts.isImportSpecifier(node)) {
        // Remove all export declarations and undefined imported functions
        return undefined;
      }
      return node;
    });

    const hasChanged = isSourceCodeChanged(diagnostic.file.getFullText(), text);
    if (hasChanged) {
      return [{ fileName: diagnostic.file.fileName, text }];
    }
    return [];
  };
}
