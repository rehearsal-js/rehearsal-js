import { describe, expect, test } from 'vitest';

import { getClassByName } from '../../src';
import { setupTest } from '../helpers';

describe('Test getClassByName', () => {
  const { sourceFile } = setupTest(__filename);

  function classReturned(targetTypeName: string, indexOfStatement: number): void {
    const declaration = sourceFile && getClassByName(sourceFile, targetTypeName);

    expect(declaration).toBeDefined();
    expect(declaration).toEqual(sourceFile?.statements[indexOfStatement]);
  }

  function classUndefined(targetTypeName: string): void {
    const declaration = sourceFile && getClassByName(sourceFile, targetTypeName);

    expect(declaration).toBeUndefined();
  }

  test('should return class', () => {
    classReturned('Class1', 0);
  });

  test('should return class that is being exported', () => {
    classReturned('Class2', 1);
  });

  test('should return class exported as default', () => {
    classReturned('Class3', 2);
  });

  test('should return undefined for a class that does not exist', () => {
    classUndefined('Class4');
  });
});
