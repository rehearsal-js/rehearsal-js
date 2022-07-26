import { assert } from 'chai';
import { describe, it } from 'mocha';

import { setupTest } from '../helpers';
import { getClassByName } from '../../src/tsc-utils';

describe('Test getClassByName', () => {
  const { sourceFile } = setupTest(__filename);

  function classReturned(targetTypeName: string, indexOfStatement: number): void {
    const declaration = sourceFile && getClassByName(sourceFile, targetTypeName);
    assert.exists(declaration);
    assert.equal(declaration, sourceFile?.statements[indexOfStatement]);
  }

  function classUndefined(targetTypeName: string): void {
    const declaration = sourceFile && getClassByName(sourceFile, targetTypeName);
    assert.equal(declaration, undefined);
  }

  it('should return class', () => {
    classReturned('Class1', 0);
  });

  it('should return class that is being exported', () => {
    classReturned('Class2', 1);
  });

  it('should return class exported as default', () => {
    classReturned('Class3', 2);
  });

  it('should return undefined for a class that does not exist', () => {
    classUndefined('Class4');
  });
});
