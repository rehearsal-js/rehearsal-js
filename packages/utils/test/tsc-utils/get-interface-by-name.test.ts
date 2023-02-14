import { fileURLToPath } from 'url';
import { describe, expect, test } from 'vitest';
import { getInterfaceByName } from '../../src';
import { setupTest } from '../helpers';

const __filename = fileURLToPath(import.meta.url);

describe('Test getInterfaceByName', () => {
  const { sourceFile } = setupTest(__filename);

  function interfaceReturned(targetTypeName: string, indexOfStatement: number): void {
    const declaration = sourceFile && getInterfaceByName(sourceFile, targetTypeName);

    expect(declaration).toBeDefined();
    expect(declaration).toEqual(sourceFile?.statements[indexOfStatement]);
  }

  function interfaceUndefined(targetTypeName: string): void {
    const declaration = sourceFile && getInterfaceByName(sourceFile, targetTypeName);

    expect(declaration).toBeUndefined();
  }

  test('should get interface declaration', () => {
    interfaceReturned('Person', 0);
  });

  test('should get interface declaration with a type argument', () => {
    interfaceReturned('Student', 1);
  });

  test('should get interface declaration with two type arguments', () => {
    interfaceReturned('Pair', 2);
  });

  test('should get interface declaration being exported', () => {
    interfaceReturned('Car', 3);
  });

  test('should get interface declaration being exported that has a type argument', () => {
    interfaceReturned('Collection', 4);
  });

  test('should get interface declaration being exported as default that has a type argument', () => {
    interfaceReturned('Teacher', 5);
  });

  test('should return undefined for an interface that does not exist', () => {
    interfaceUndefined('Child');
  });
});
