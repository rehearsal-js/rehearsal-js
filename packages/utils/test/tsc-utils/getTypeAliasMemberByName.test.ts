import ts from 'typescript';
import { assert } from 'chai';
import { describe, it } from 'mocha';

import { setupTest } from '../helpers';
import { getTypeAliasMemberByName } from '../../src/tsc-utils';

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
    if (statements && ts.isTypeAliasDeclaration(statements[indexOfStatement])) {
      statement = statements[indexOfStatement];
      memberObj = getTypeAliasMemberByName(statement as ts.TypeAliasDeclaration, memberName);
    }
    assert.exists(memberObj);
    assert.equal(
      memberObj,
      ((statement as ts.TypeAliasDeclaration).type as ts.TypeLiteralNode).members[indexOfMember]
    );
  }

  function typeAliasMemberUndefined(indexOfStatement: number, memberName: string): void {
    let statement;
    let memberObj;
    if (statements && ts.isInterfaceDeclaration(statements[indexOfStatement])) {
      statement = statements[indexOfStatement];
      memberObj = getTypeAliasMemberByName(statement as ts.TypeAliasDeclaration, memberName);
    }
    assert.equal(memberObj, undefined);
  }

  it('should return type alias member', () => {
    typeAliasMemberReturned(0, 'make', 3);
  });

  it('should return type alias member for a type alias with generics ', () => {
    typeAliasMemberReturned(1, 'items', 0);
  });

  it('should return type alias member for an type alias that is exported', () => {
    typeAliasMemberReturned(2, 'year', 1);
  });

  it('should return undefined for interface member that does not exist', () => {
    typeAliasMemberUndefined(0, 'age');
  });
});
