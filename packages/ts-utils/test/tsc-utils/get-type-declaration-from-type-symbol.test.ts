import { fileURLToPath } from 'url';
import { describe, expect, test } from 'vitest';
import { getTypeDeclarationFromTypeSymbol } from '../../src/index.js';
import { setupTest } from '../helpers.js';
import type { InterfaceDeclaration } from 'typescript';

const __filename = fileURLToPath(import.meta.url);

describe('Test getTypeDeclarationFromSymbol', () => {
  const { sourceFile, checker } = setupTest(__filename);
  const statements = sourceFile && sourceFile.statements;

  test('should return type declaration', () => {
    let declaration;
    if (statements && statements[0]) {
      const type = checker.getTypeAtLocation(statements[0]);
      declaration = getTypeDeclarationFromTypeSymbol(type);
    }

    expect((declaration as InterfaceDeclaration)?.name.escapedText.toString()).toEqual('T6');
  });

  test('should return type literal for type alias declaration', () => {
    let declaration;
    if (statements && statements[1]) {
      const type = checker.getTypeAtLocation(statements[1]);
      declaration = getTypeDeclarationFromTypeSymbol(type);
    }

    expect((declaration as InterfaceDeclaration)?.name.escapedText.toString()).toEqual('T7');
  });
});
