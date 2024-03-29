import {
  ChangesFactory,
  findNodeAtPosition,
  getClassByName,
  getClassMemberByName,
  getInterfaceByName,
  getInterfaceMemberByName,
  getTypeAliasByName,
  getTypeAliasMemberByName,
  getTypeDeclarationFromTypeSymbol,
  getTypeNameFromType,
} from '@rehearsal/ts-utils';
import ts from 'typescript';
import { createCodeFixAction } from '../hints-codefix-collection.js';
import { Diagnostics } from '../diagnosticInformationMap.generated.js';
import type { CodeFix, DiagnosticWithContext } from '../types.js';
import type {
  CodeFixAction,
  InterfaceDeclaration,
  PropertyDeclaration,
  PropertySignature,
  SourceFile,
  TypeAliasDeclaration,
  TypeElement,
} from 'typescript';

const { isPropertyAccessExpression, isDeleteExpression, isInterfaceDeclaration } = ts;

const OPTIONAL_TOKEN = '?';

export class MakeMemberOptionalCodeFix implements CodeFix {
  getErrorCodes = (): number[] => [Diagnostics.TS2790.code];

  getCodeAction(diagnostic: DiagnosticWithContext): CodeFixAction | undefined {
    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);

    if (
      !errorNode ||
      !isPropertyAccessExpression(errorNode) ||
      !isDeleteExpression(errorNode.parent)
    ) {
      return undefined;
    }

    const checker = diagnostic.checker;

    const type = checker.getTypeAtLocation(errorNode.expression);

    const typeDeclaration = getTypeDeclarationFromTypeSymbol(type);
    if (!typeDeclaration) {
      return undefined;
    }

    const sourceFile = typeDeclaration.getSourceFile();

    const typeName = getTypeNameFromType(type, checker); //'Person' as in 'Interface Person' or 'Car' as in 'class Car'
    const typeMemberName = errorNode.name.getText(); //'name' as in 'delete person.name' or 'make' as in 'delete car.make';

    if (!typeMemberName || !typeName || !sourceFile) {
      return undefined;
    }

    let nameEnd;
    if (type.isClass()) {
      const classMemberDeclaration = this.findClassMemberDeclaration(
        sourceFile,
        typeName,
        typeMemberName
      );
      nameEnd = classMemberDeclaration && classMemberDeclaration.name.getEnd();
    } else {
      const typeMemberDeclaration = this.findTypeMemberDeclaration(
        sourceFile,
        typeName,
        typeMemberName
      );
      nameEnd = typeMemberDeclaration && (typeMemberDeclaration as PropertySignature).name.getEnd();
    }

    if (!nameEnd) {
      return undefined;
    }

    const changes = ChangesFactory.insertText(sourceFile, nameEnd, OPTIONAL_TOKEN);

    return createCodeFixAction('makeMemberOptional', [changes], 'Make member optional');
  }

  findClassMemberDeclaration(
    sourceFile: SourceFile,
    typeName: string,
    memberName: string
  ): PropertyDeclaration | undefined {
    let matchedMember;
    const matchedClass = getClassByName(sourceFile, typeName);
    if (matchedClass) {
      matchedMember = getClassMemberByName(matchedClass, memberName);
    }
    return matchedMember as PropertyDeclaration;
  }

  findTypeMemberDeclaration(
    sourceFile: SourceFile,
    typeName: string,
    memberName: string
  ): TypeElement | undefined {
    const matchedInterface: InterfaceDeclaration | undefined = getInterfaceByName(
      sourceFile,
      typeName
    );
    const matchedTypeAlias: TypeAliasDeclaration | undefined = getTypeAliasByName(
      sourceFile,
      typeName
    );
    const matchedType = matchedInterface || matchedTypeAlias;

    let matchedMember;
    if (matchedType && isInterfaceDeclaration(matchedType)) {
      matchedMember = getInterfaceMemberByName(matchedType, memberName);
    } else if (matchedType) {
      matchedMember = getTypeAliasMemberByName(matchedType, memberName);
    }

    return matchedMember;
  }
}
