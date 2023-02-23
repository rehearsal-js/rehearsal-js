import { describe, expect, test } from 'vitest';

import { getTypeNameFromType } from '../../src/index.js';
import { setupTest } from '../helpers.js';
import type { BinaryExpression, ExpressionStatement } from 'typescript';

describe('Test getTypeNameFromType', () => {
  const { sourceFile, checker } = setupTest(__filename);
  const statements = sourceFile && sourceFile.statements;

  test('should return type name for type alias', () => {
    let typeName;
    if (statements && statements[1]) {
      const typeObj = checker.getTypeAtLocation(statements[1]);
      typeName = getTypeNameFromType(typeObj, checker);
    }

    expect(typeName).toEqual('T1');
  });

  test('should return type name for interface', () => {
    let typeName;
    if (statements && statements[2]) {
      const typeObj = checker.getTypeAtLocation(statements[2]);
      typeName = getTypeNameFromType(typeObj, checker);
    }

    expect(typeName).toEqual('T2');
  });

  test('should return type name for type alias with generics', () => {
    let typeName;
    if (statements && statements[3]) {
      const typeObj = checker.getTypeAtLocation(statements[3]);
      typeName = getTypeNameFromType(typeObj, checker);
    }

    expect(typeName).toEqual('T3');
  });

  test('should return type name for type imported as default', () => {
    let typeName;

    if (statements && statements[5]) {
      const node = ((statements[5] as ExpressionStatement).expression as BinaryExpression).left;
      const typeObj = checker.getTypeAtLocation(node);
      typeName = getTypeNameFromType(typeObj, checker);
    }

    expect(typeName).toEqual('T4');
  });

  test('should return type name for type exported as default', () => {
    let typeName;

    if (statements && statements[6]) {
      const typeObj = checker.getTypeAtLocation(statements[6]);
      typeName = getTypeNameFromType(typeObj, checker);
    }

    expect(typeName).toEqual('T5');
  });
});
