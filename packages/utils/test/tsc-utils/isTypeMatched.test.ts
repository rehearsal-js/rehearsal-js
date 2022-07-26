// import ts from 'typescript';
import { assert } from 'chai';
import { describe, it } from 'mocha';

import { setupTest } from '../helpers';
import { isTypeMatched } from '../../src/tsc-utils';

describe('Test isTypeMatched', () => {
  const { sourceFile, checker } = setupTest(__filename);
  const statements = sourceFile && sourceFile.statements;

  function matched(indexOfStatement: number, typeString: string): void {
    let isMatched = false;
    if (statements && statements[indexOfStatement]) {
      const typeObj = checker.getTypeAtLocation(statements[indexOfStatement]);
      isMatched = isTypeMatched(typeString, typeObj);
    }
    assert.equal(isMatched, true);
  }

  function notMatched(indexOfStatement: number, typeString: string): void {
    let isMatched = false;
    if (statements && statements[indexOfStatement]) {
      const typeObj = checker.getTypeAtLocation(statements[indexOfStatement]);
      isMatched = isTypeMatched(typeString, typeObj);
    }
    assert.equal(isMatched, false);
  }

  it('should return true if type name matches an interface', () => {
    matched(0, 'T10');
  });

  it('should return true if type name matches a type alias', () => {
    matched(1, 'T11');
  });

  it('should return true if type name matches an interface with constraint', () => {
    matched(2, 'T12');
  });

  it('should return false if type name is empty string', () => {
    notMatched(3, '');
  });

  it('should return false if type name does not match', () => {
    matched(4, 'T14');
  });
});
