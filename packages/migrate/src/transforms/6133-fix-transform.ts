import ts from 'typescript';

import FixTransform from '../interfaces/fix-transform';
import { transformDiagnosedNode } from '../helpers/typescript-ast';

export default class FixTransform6133 extends FixTransform {
  hint = `The declaration '{0}' is never read or used. Remove the declaration or use it.`;

  fix = (diagnostic: ts.DiagnosticWithLocation): string => {
    return transformDiagnosedNode(diagnostic, (node: ts.Node) => {
      // Remove all export declarations and undefined imported functions
      if (ts.isImportDeclaration(node) || ts.isImportSpecifier(node)) {
        return undefined;
      }

      // TODO: Cover more TS6133 cases - unused functions, params, variables etc.

      return node;
    });
  };
}
