import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import { setupTest } from '../helpers';
import { getTypeDeclarationFromTypeSymbol } from '../../src/tsc-utils';

describe('Test getTypeDeclarationFromSymbol', () => {
  const { sourceFile, checker } = setupTest(__filename);
  const statements = sourceFile && sourceFile.statements;

  test('should return type declaration', () => {
    let declaration;
    if (statements && statements[0]) {
      const type = checker.getTypeAtLocation(statements[0]);
      declaration = getTypeDeclarationFromTypeSymbol(type);
    }

    expect((declaration as ts.InterfaceDeclaration)?.name.escapedText.toString()).toEqual('T6');
  });

  test('should return type literal for type alias declaration', () => {
    let declaration;
    if (statements && statements[1]) {
      const type = checker.getTypeAtLocation(statements[1]);
      declaration = getTypeDeclarationFromTypeSymbol(type);
    }

    expect((declaration as ts.InterfaceDeclaration)?.name.escapedText.toString()).toEqual('T7');
  });
});
