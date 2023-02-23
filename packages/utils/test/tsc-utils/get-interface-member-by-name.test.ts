import { isInterfaceDeclaration } from 'typescript';
import { describe, expect, test } from 'vitest';

import { getInterfaceMemberByName } from '../../src/index.js';
import { setupTest } from '../helpers.js';
import type { InterfaceDeclaration } from 'typescript';

describe('Test getInterfaceMemberByName', () => {
  const { sourceFile } = setupTest(__filename);
  const statements = sourceFile && sourceFile.statements;

  function interfaceMemberReturned(
    indexOfStatement: number,
    memberName: string,
    indexOfMember: number
  ): void {
    let statement;
    let memberObj;
    if (statements && isInterfaceDeclaration(statements[indexOfStatement])) {
      statement = statements[indexOfStatement];
      memberObj = getInterfaceMemberByName(statement as InterfaceDeclaration, memberName);
    }

    expect(memberObj).toBeDefined();
    expect(memberObj).toEqual((statement as InterfaceDeclaration).members[indexOfMember]);
  }

  function interfaceMemberUndefined(indexOfStatement: number, memberName: string): void {
    let statement;
    let memberObj;
    if (statements && isInterfaceDeclaration(statements[indexOfStatement])) {
      statement = statements[indexOfStatement];
      memberObj = getInterfaceMemberByName(statement as InterfaceDeclaration, memberName);
    }

    expect(memberObj).toBeUndefined();
  }

  test('should return interface member', () => {
    interfaceMemberReturned(0, 'name', 0);
  });

  test('should return interface member for an interface that is exported', () => {
    interfaceMemberReturned(1, 'model', 0);
  });

  test('should return interface member for an interface that is exported', () => {
    interfaceMemberReturned(2, 'color', 1);
  });

  test('should return undefined for interface member that does not exist', () => {
    interfaceMemberUndefined(0, 'age');
  });
});
