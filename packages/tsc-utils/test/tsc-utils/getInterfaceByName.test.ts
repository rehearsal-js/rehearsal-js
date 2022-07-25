import { assert } from 'chai';
import { describe, it } from 'mocha';

import { setupTest } from '../helpers';
import { getInterfaceByName } from '../../src/tsc-utils';

describe('Test getInterfaceByName', () => {
  const { sourceFile } = setupTest(__filename);

  function interfaceReturned(targetTypeName: string, indexOfStatement: number): void {
    const declaration = sourceFile && getInterfaceByName(sourceFile, targetTypeName);
    assert.exists(declaration);
    assert.equal(declaration, sourceFile?.statements[indexOfStatement]);
  }

  function interfaceUndefined(targetTypeName: string): void {
    const declaration = sourceFile && getInterfaceByName(sourceFile, targetTypeName);
    assert.equal(declaration, undefined);
  }
  it('should get interface declaration', () => {
    interfaceReturned('Person', 0);
  });
  it('should get interface declaration with a type argument', () => {
    interfaceReturned('Student', 1);
  });
  it('should get interface declaration with two type arguments', () => {
    interfaceReturned('Pair', 2);
  });
  it('should get interface declaration being exported', () => {
    interfaceReturned('Car', 3);
  });
  it('should get interface declaration being exported that has a type argument', () => {
    interfaceReturned('Collection', 4);
  });
  it('should get interface declaration being exported as default that has a type argument', () => {
    interfaceReturned('Teacher', 5);
  });
  it('should return undefined for an interface that does not exist', () => {
    interfaceUndefined('Child');
  });
});
