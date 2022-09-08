import { describe, expect, test } from 'vitest';

import { isTypeMatched } from '../../src';
import { setupTest } from '../helpers';

describe('Test isTypeMatched', () => {
  const { sourceFile, checker } = setupTest(__filename);
  const statements = sourceFile && sourceFile.statements;

  function matched(indexOfStatement: number, typeString: string): void {
    let isMatched = false;
    if (statements && statements[indexOfStatement]) {
      const typeObj = checker.getTypeAtLocation(statements[indexOfStatement]);
      isMatched = isTypeMatched(typeString, typeObj);
    }

    expect(isMatched).toBeTruthy();
  }

  function notMatched(indexOfStatement: number, typeString: string): void {
    let isMatched = false;
    if (statements && statements[indexOfStatement]) {
      const typeObj = checker.getTypeAtLocation(statements[indexOfStatement]);
      isMatched = isTypeMatched(typeString, typeObj);
    }
    expect(isMatched).toBeFalsy();
  }

  test('should return true if type name matches an interface', () => {
    matched(0, 'T10');
  });

  test('should return true if type name matches a type alias', () => {
    matched(1, 'T11');
  });

  test('should return true if type name matches an interface with constraint', () => {
    matched(2, 'T12');
  });

  test('should return false if type name is empty string', () => {
    notMatched(3, '');
  });

  test('should return false if type name does not match', () => {
    matched(4, 'T14');
  });
});
