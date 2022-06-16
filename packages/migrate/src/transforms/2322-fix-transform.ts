import ts from 'typescript';

import FixTransform, { type FixedFile } from '../interfaces/fix-transform';

import { findNodeAtPosition } from '../helpers/typescript-ast';

export default class FixTransform2322 extends FixTransform {
  getHint = (replacements: { [key: string]: string }, diagnostic: ts.DiagnosticWithLocation) => {
    const values = Object.values(replacements);
    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
    if (values.length < 2 || !errorNode) {
      return undefined;
    }

    const { '{0}': actualType, '{1}': expectedType } = replacements;

    let hint = `Type '${actualType}' is being returned or assigned, but type '${expectedType}' is expected. Please convert type '${actualType}' to type '${expectedType}', or return or assign a variable of type '${expectedType}'`;
    if (ts.isReturnStatement(errorNode)) {
      hint = `The function expects to return '${expectedType}', but '${actualType}' is returned. Please convert '${actualType}' value to '${expectedType}' or update the function's return type.`;
    } else if (ts.isIdentifier(errorNode)) {
      hint = `The variable '${errorNode.escapedText}' has type '${expectedType}', but '${actualType}' is assigned. Please convert '${actualType}' to '${expectedType}' or change variable's type.`;
    }
    return hint;
  };

  fix = (): FixedFile[] => {
    return [];
  };
}
