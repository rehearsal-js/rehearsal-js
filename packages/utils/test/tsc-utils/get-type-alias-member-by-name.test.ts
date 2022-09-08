import type { TypeAliasDeclaration, TypeLiteralNode } from 'typescript';
import { isInterfaceDeclaration, isTypeAliasDeclaration } from 'typescript';
import { describe, expect, test } from 'vitest';

import { getTypeAliasMemberByName } from '../../src';
import { setupTest } from '../helpers';

describe('Test getTypeAliasMemberByName', () => {
  const { sourceFile } = setupTest(__filename);
  const statements = sourceFile && sourceFile.statements;

  function typeAliasMemberReturned(
    indexOfStatement: number,
    memberName: string,
    indexOfMember: number
  ): void {
    let statement;
    let memberObj;
    if (statements && isTypeAliasDeclaration(statements[indexOfStatement])) {
      statement = statements[indexOfStatement];
      memberObj = getTypeAliasMemberByName(statement as TypeAliasDeclaration, memberName);
    }

    expect(memberObj).toBeDefined();
    expect(memberObj).toEqual(
      ((statement as TypeAliasDeclaration).type as TypeLiteralNode).members[indexOfMember]
    );
  }

  function typeAliasMemberUndefined(indexOfStatement: number, memberName: string): void {
    let statement;
    let memberObj;
    if (statements && isInterfaceDeclaration(statements[indexOfStatement])) {
      statement = statements[indexOfStatement];
      memberObj = getTypeAliasMemberByName(statement as TypeAliasDeclaration, memberName);
    }

    expect(memberObj).toBeUndefined();
  }

  test('should return type alias member', () => {
    typeAliasMemberReturned(0, 'make', 3);
  });

  test('should return type alias member for a type alias with generics ', () => {
    typeAliasMemberReturned(1, 'items', 0);
  });

  test('should return type alias member for an type alias that is exported', () => {
    typeAliasMemberReturned(2, 'year', 1);
  });

  test('should return undefined for interface member that does not exist', () => {
    typeAliasMemberUndefined(0, 'age');
  });
});
