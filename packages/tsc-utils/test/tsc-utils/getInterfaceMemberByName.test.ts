import ts from 'typescript';
import { assert } from 'chai';
import { describe, it } from 'mocha';

import { setupTest } from '../helpers';
import { getInterfaceMemberByName } from '../../src/tsc-utils';

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
    if (statements && ts.isInterfaceDeclaration(statements[indexOfStatement])) {
      statement = statements[indexOfStatement];
      memberObj = getInterfaceMemberByName(statement as ts.InterfaceDeclaration, memberName);
    }
    assert.exists(memberObj);
    assert.equal(memberObj, (statement as ts.InterfaceDeclaration).members[indexOfMember]);
  }

  function interfaceMemberUndefined(indexOfStatement: number, memberName: string): void {
    let statement;
    let memberObj;
    if (statements && ts.isInterfaceDeclaration(statements[indexOfStatement])) {
      statement = statements[indexOfStatement];
      memberObj = getInterfaceMemberByName(statement as ts.InterfaceDeclaration, memberName);
    }
    assert.equal(memberObj, undefined);
  }

  it('should return interface member', () => {
    interfaceMemberReturned(0, 'name', 0);
  });

  it('should return interface member for an interface that is exported', () => {
    interfaceMemberReturned(1, 'model', 0);
  });

  it('should return interface member for an interface that is exported', () => {
    interfaceMemberReturned(2, 'color', 1);
  });

  it('should return undefined for interface member that does not exist', () => {
    interfaceMemberUndefined(0, 'age');
  });
});
