import { assert } from 'chai';
import { describe, it } from 'mocha';

import { setupTest } from '../helpers';
import { getTypeNameFromType } from '../../src/tsc-utils';
import ts from 'typescript';

describe('Test getTypeNameFromType', () => {
  const { sourceFile, checker } = setupTest(__filename);
  const statements = sourceFile && sourceFile.statements;

  it('should return type name for type alias', () => {
    let typeName;
    if (statements && statements[1]) {
      const typeObj = checker.getTypeAtLocation(statements[1]);
      typeName = getTypeNameFromType(typeObj, checker);
    }
    assert.equal(typeName, 'T1');
  });

  it('should return type name for interface', () => {
    let typeName;
    if (statements && statements[2]) {
      const typeObj = checker.getTypeAtLocation(statements[2]);
      typeName = getTypeNameFromType(typeObj, checker);
    }
    assert.equal(typeName, 'T2');
  });

  it('should return type name for type alias with generics', () => {
    let typeName;
    if (statements && statements[3]) {
      const typeObj = checker.getTypeAtLocation(statements[3]);
      typeName = getTypeNameFromType(typeObj, checker);
    }
    assert.equal(typeName, 'T3');
  });

  it('should return type name for type imported as default', () => {
    let typeName;

    if (statements && statements[5]) {
      const node = ((statements[5] as ts.ExpressionStatement).expression as ts.BinaryExpression)
        .left;
      const typeObj = checker.getTypeAtLocation(node);
      typeName = getTypeNameFromType(typeObj, checker);
    }
    assert.equal(typeName, 'T4');
  });

  it('should return type name for type exported as default', () => {
    let typeName;

    if (statements && statements[6]) {
      const typeObj = checker.getTypeAtLocation(statements[6]);
      typeName = getTypeNameFromType(typeObj, checker);
    }
    assert.equal(typeName, 'T5');
  });
});
