import ts from 'typescript';
import { assert } from 'chai';
import { describe, it } from 'mocha';

import { setupTest } from '../helpers';
import { getTypeDeclarationFromTypeSymbol } from '../../src/tsc-utils';

describe('Test getTypeDeclarationFromSymbol', () => {
  const { sourceFile, checker } = setupTest(__filename);
  const statements = sourceFile && sourceFile.statements;

  it('should return type declaration', () => {
    let declaration;
    if (statements && statements[0]) {
      const type = checker.getTypeAtLocation(statements[0]);
      declaration = getTypeDeclarationFromTypeSymbol(type);
      console.log('kind', declaration?.kind);
    }
    assert.equal((declaration as ts.InterfaceDeclaration)?.name.escapedText.toString(), 'T6');
  });

  it('should return type literal for type alias declaration', () => {
    let declaration;
    if (statements && statements[1]) {
      const type = checker.getTypeAtLocation(statements[1]);
      declaration = getTypeDeclarationFromTypeSymbol(type);
    }
    assert.equal((declaration as ts.InterfaceDeclaration)?.name.escapedText.toString(), 'T7');
  });
});
