import { assert } from 'chai';
import { describe, it } from 'mocha';

import { setupTest } from '../helpers';
import { getTypeNameFromVariable } from '../../src/tsc-utils';
import ts from 'typescript';

describe('Test getTypeNameFromVariable', () => {
  const { sourceFile, checker } = setupTest(__filename);
  const statements = sourceFile && sourceFile.statements;

  function typeNameReturned(indexOfStatement: number, targetTypeName: string): void {
    let typeName;
    if (statements && statements[indexOfStatement]) {
      const variable = (statements[indexOfStatement] as ts.VariableStatement).declarationList
        .declarations[0].name;
      typeName = getTypeNameFromVariable(variable, checker);
    }
    assert.equal(typeName, targetTypeName);
  }

  it('should return type name for numeral literal', () => {
    typeNameReturned(1, 'number');
  });

  it('should return type name for string literal', () => {
    typeNameReturned(2, 'string');
  });

  it('should return type name for undefined', () => {
    typeNameReturned(3, 'undefined');
  });

  it('should return type name for unknown', () => {
    typeNameReturned(4, 'unknown');
  });

  it('should return type name for any', () => {
    typeNameReturned(5, 'any');
  });

  it('should return type name for type alias', () => {
    typeNameReturned(7, 'Car');
  });

  it('should return type name for type literal', () => {
    typeNameReturned(8, '{ name: string; age: number; }');
  });

  it('should return type name for type literal', () => {
    typeNameReturned(11, 'List<Item>');
  });

  it('should return type name for imported type', () => {
    typeNameReturned(12, 'T4');
  });

  it('should return type name for imported type with constraint', () => {
    typeNameReturned(13, 'T5');
  });
});
