import ts from 'typescript';
import { assert } from 'chai';
import { describe, it } from 'mocha';

import { setupTest } from '../helpers';
import { isSubtypeOf } from '../../src/tsc-utils';

describe('Test isSubtypeOf', () => {
  const { sourceFile, checker } = setupTest(__filename);
  const statements = sourceFile && sourceFile.statements;

  function hasSubtype(indexOfStatement: number, targetTypeName: string): void {
    let parentType;
    if (statements && statements[indexOfStatement]) {
      const variable = (statements[indexOfStatement] as ts.VariableStatement).declarationList
        .declarations[0].name;
      parentType = checker.getTypeAtLocation(variable);
    }
    assert.equal(parentType && isSubtypeOf(targetTypeName, parentType, checker), true);
  }

  function hasNotSubtype(indexOfStatement: number, targetTypeName: string): void {
    let parentType;
    if (statements && statements[indexOfStatement]) {
      const variable = (statements[indexOfStatement] as ts.VariableStatement).declarationList
        .declarations[0].name;
      parentType = checker.getTypeAtLocation(variable);
    }
    assert.equal(parentType && isSubtypeOf(targetTypeName, parentType, checker), false);
  }

  it('should return type being its own subtype', () => {
    hasSubtype(1, 'T1');
  });

  it('should return type argument being a subtype', () => {
    hasSubtype(4, 'Age');
  });

  it('should not return component type of a union type being a subtype', () => {
    hasNotSubtype(6, 'number');
  });

  it('should return component type of a intersection type being a subtype', () => {
    hasSubtype(9, 'Student');
  });

  it('should return false when empty string is passed in as the subttype string', () => {
    hasNotSubtype(1, '');
  });
});
