import { isClassDeclaration, isInterfaceDeclaration } from 'typescript';
import { describe, expect, test } from 'vitest';

import { getClassMemberByName } from '../..';
import { setupTest } from '../helpers';
import type { ClassDeclaration } from 'typescript';

describe('Test getClassMemberByName', () => {
  const { sourceFile } = setupTest(__filename);
  const statements = sourceFile && sourceFile.statements;

  function classMemberReturned(
    indexOfStatement: number,
    memberName: string,
    indexOfMember: number
  ): void {
    let statement;
    let memberObj;
    if (statements && isClassDeclaration(statements[indexOfStatement])) {
      statement = statements[indexOfStatement];
      memberObj = getClassMemberByName(statement as ClassDeclaration, memberName);
    }

    expect(memberObj).toBeDefined();
    expect(memberObj).toEqual((statement as ClassDeclaration).members[indexOfMember]);
  }

  function classMemberUndefined(indexOfStatement: number, memberName: string): void {
    let statement;
    let memberObj;
    if (statements && isInterfaceDeclaration(statements[indexOfStatement])) {
      statement = statements[indexOfStatement];
      memberObj = getClassMemberByName(statement as ClassDeclaration, memberName);
    }

    expect(memberObj).toBeUndefined();
  }

  test('should return class member', () => {
    classMemberReturned(0, 'field1', 0);
  });

  test('should return class member for a class that is exported', () => {
    classMemberReturned(1, 'field4', 1);
  });

  test('should return class member for a class that is exported as default', () => {
    classMemberReturned(2, 'field5', 0);
  });

  test('should return undefined for a class that does not have members', () => {
    classMemberUndefined(3, 'age');
  });

  test('should return undefined for a class that does not have the specified member', () => {
    classMemberUndefined(2, 'age');
  });
});
