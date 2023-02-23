import { describe, expect, test } from 'vitest';

import { getTypeNameFromVariable } from '../../src/index.js';
import { setupTest } from '../helpers.js';
import type { VariableStatement } from 'typescript';

describe('Test getTypeNameFromVariable', () => {
  const { sourceFile, checker } = setupTest(__filename);
  const statements = sourceFile && sourceFile.statements;

  function typeNameReturned(indexOfStatement: number, targetTypeName: string): void {
    let typeName;
    if (statements && statements[indexOfStatement]) {
      const variable = (statements[indexOfStatement] as VariableStatement).declarationList
        .declarations[0].name;
      typeName = getTypeNameFromVariable(variable, checker);
    }

    expect(typeName).toEqual(targetTypeName);
  }

  test('should return type name for numeral literal', () => {
    typeNameReturned(1, 'number');
  });

  test('should return type name for string literal', () => {
    typeNameReturned(2, 'string');
  });

  test('should return type name for undefined', () => {
    typeNameReturned(3, 'undefined');
  });

  test('should return type name for unknown', () => {
    typeNameReturned(4, 'unknown');
  });

  test('should return type name for any', () => {
    typeNameReturned(5, 'any');
  });

  test('should return type name for type alias', () => {
    typeNameReturned(7, 'Car');
  });

  test('should return type name for type literal', () => {
    typeNameReturned(8, '{ name: string; age: number; }');
  });

  test('should return type name for type literal', () => {
    typeNameReturned(11, 'List<Item>');
  });

  test('should return type name for imported type', () => {
    typeNameReturned(12, 'T4');
  });

  test('should return type name for imported type with constraint', () => {
    typeNameReturned(13, 'T5');
  });
});
