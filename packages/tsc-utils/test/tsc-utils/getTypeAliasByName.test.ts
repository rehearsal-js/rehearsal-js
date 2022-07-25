import { assert } from 'chai';
import { describe, it } from 'mocha';

import { setupTest } from '../helpers';
import { getTypeAliasByName } from '../../src/tsc-utils';

describe('Test getTypeAliasByName', () => {
  const { sourceFile } = setupTest(__filename);

  function typeAliasReturned(targetTypeName: string, indexOfStatement: number): void {
    const declaration = sourceFile && getTypeAliasByName(sourceFile, targetTypeName);
    assert.exists(declaration);
    assert.equal(declaration, sourceFile?.statements[indexOfStatement]);
  }

  function typeAliasUndefined(targetTypeName: string): void {
    const declaration = sourceFile && getTypeAliasByName(sourceFile, targetTypeName);
    assert.equal(declaration, undefined);
  }

  it('should return type Alias with union of string literal', () => {
    typeAliasReturned('Car', 0);
  });

  it('should return type Alias with union of types', () => {
    typeAliasReturned('StringOrNumber', 1);
  });

  it('should return type Alias for function signature', () => {
    typeAliasReturned('StringRepeater', 2);
  });

  it('should return type Alias with generics', () => {
    typeAliasReturned('List', 3);
  });

  it('should return type Alias exported', () => {
    typeAliasReturned('Decrementor', 4);
  });

  it('should return type Alias ', () => {
    typeAliasReturned('Tree', 5);
  });

  it('should return undefined for a type alias that does not exist', () => {
    typeAliasUndefined('Child');
  });
});
