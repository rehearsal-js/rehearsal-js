// import ts from 'typescript';

import FixTransform, { FixedFile } from '../interfaces/fix-transform';
// import { findNodeAtPosition } from '../helpers/typescript-ast';

export default class FixTransform2345 extends FixTransform {
  getHint = (replacements: { [key: string]: string }) => {
    if (Object.values(replacements).length < 2) {
      return undefined;
    }
    let hint = '';

    const { '{0}': actualType, '{1}': expectedType } = replacements;
    if (actualType === 'unknown' || actualType === 'any') {
      hint = `Argument of type '${actualType}' is not assignable to parameter of type '${expectedType}'. Consider specifying type of argument to be '${expectedType}', using type assertion: '(argument as ${expectedType})', or using type guard: 'if (argument instanceof ${expectedType}) { ... }'.`;
    } else {
      hint = `Argument of type '${actualType}' is not assignable to parameter of type '${expectedType}'. Consider verifying both types, using type assertion: '(argument as ${expectedType})', or using type guard: 'if (argument instanceof ${expectedType}) { ... }'.`;
    }
    return hint;
  };

  fix = (): FixedFile[] => {
    return [];
  };
}
