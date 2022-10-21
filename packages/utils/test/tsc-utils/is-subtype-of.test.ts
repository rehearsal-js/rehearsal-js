import { describe, expect, test } from 'vitest';

import { isSubtypeOf } from '../../src';
import { setupTest } from '../helpers';
import type { VariableStatement } from 'typescript';

describe('Test isSubtypeOf', () => {
  const { sourceFile, checker } = setupTest(__filename);
  const statements = sourceFile && sourceFile.statements;

  function hasSubtype(indexOfStatement: number, targetTypeName: string): void {
    let parentType;
    if (statements && statements[indexOfStatement]) {
      const variable = (statements[indexOfStatement] as VariableStatement).declarationList
        .declarations[0].name;
      parentType = checker.getTypeAtLocation(variable);
    }

    expect(parentType && isSubtypeOf(targetTypeName, parentType, checker)).toBeTruthy();
  }

  function hasNotSubtype(indexOfStatement: number, targetTypeName: string): void {
    let parentType;
    if (statements && statements[indexOfStatement]) {
      const variable = (statements[indexOfStatement] as VariableStatement).declarationList
        .declarations[0].name;
      parentType = checker.getTypeAtLocation(variable);
    }

    expect(parentType && isSubtypeOf(targetTypeName, parentType, checker)).toBeFalsy();
  }

  test('should return type being its own subtype', () => {
    hasSubtype(1, 'T1');
  });

  test('should return type argument being a subtype', () => {
    hasSubtype(4, 'Age');
  });

  test('should not return component type of a union type being a subtype', () => {
    hasNotSubtype(6, 'number');
  });

  test('should return component type of a intersection type being a subtype', () => {
    hasSubtype(9, 'Student');
  });

  test('should return false when empty string is passed in as the subttype string', () => {
    hasNotSubtype(1, '');
  });
});
