import { describe, expect, test } from 'vitest';

import { getTypeAliasByName } from '../../src';
import { setupTest } from '../helpers';

describe('Test getTypeAliasByName', () => {
  const { sourceFile } = setupTest(__filename);

  function typeAliasReturned(targetTypeName: string, indexOfStatement: number): void {
    const declaration = sourceFile && getTypeAliasByName(sourceFile, targetTypeName);

    expect(declaration).toBeDefined();
    expect(declaration).toEqual(sourceFile?.statements[indexOfStatement]);
  }

  function typeAliasUndefined(targetTypeName: string): void {
    const declaration = sourceFile && getTypeAliasByName(sourceFile, targetTypeName);

    expect(declaration).toBeUndefined();
  }

  test('should return type Alias with union of string literal', () => {
    typeAliasReturned('Car', 0);
  });

  test('should return type Alias with union of types', () => {
    typeAliasReturned('StringOrNumber', 1);
  });

  test('should return type Alias for function signature', () => {
    typeAliasReturned('StringRepeater', 2);
  });

  test('should return type Alias with generics', () => {
    typeAliasReturned('List', 3);
  });

  test('should return type Alias exported', () => {
    typeAliasReturned('Decrementor', 4);
  });

  test('should return type Alias ', () => {
    typeAliasReturned('Tree', 5);
  });

  test('should return undefined for a type alias that does not exist', () => {
    typeAliasUndefined('Child');
  });
});
