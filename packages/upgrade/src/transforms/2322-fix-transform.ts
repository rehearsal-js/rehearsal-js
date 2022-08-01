import ts from 'typescript';

import { FixTransform, type FixedFile } from '../interfaces/fix-transform';

import { transformDiagnosedNode } from '../helpers/typescript-ast';

export class FixTransform2322 extends FixTransform {
  hint = `Type '{0}' is being returned or assigned, but type '{1}' is expected. Please convert type '{0}' to type '{1}', or return or assign a variable of type '{1}'`;

  fix = (diagnostic: ts.DiagnosticWithLocation): FixedFile[] => {
    transformDiagnosedNode(diagnostic, (node: ts.Node) => {
      if (ts.isReturnStatement(node)) {
        this.hint = `The function expects to return '{1}', but '{0}' is returned. Please convert '{0}' value to '{1}' or update the function's return type.`;
      } else if (ts.isIdentifier(node)) {
        this.hint = `The variable '${node.escapedText}' has type '{1}', but '{0}' is assigned. Please convert '{0}' to '{1}' or change variable's type.`;
      }
      return node;
    });

    return [];
  };
}
