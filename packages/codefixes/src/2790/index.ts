import { type RehearsalService } from '@rehearsal/service';
import {
  findNodeAtPosition,
  getClassByName,
  getClassMemberByName,
  getInterfaceByName,
  getInterfaceMemberByName,
  getTypeAliasByName,
  getTypeAliasMemberByName,
  getTypeDeclarationFromTypeSymbol,
  getTypeNameFromType,
  insertIntoText,
} from '@rehearsal/utils';
import { isDeleteExpression, isInterfaceDeclaration, isPropertyAccessExpression } from 'typescript';

import { type FixedFile, FixTransform } from '../types';
import { getCodemodData } from '../utils';
import type {
  DiagnosticWithLocation,
  InterfaceDeclaration,
  PropertyDeclaration,
  PropertySignature,
  SourceFile,
  TypeAliasDeclaration,
  TypeElement,
} from 'typescript';

const OPTIONAL_TOKEN = '?';

export class FixTransform2790 extends FixTransform {
  fix = (diagnostic: DiagnosticWithLocation, service: RehearsalService): FixedFile[] => {
    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);

    if (
      !errorNode ||
      !isPropertyAccessExpression(errorNode) ||
      !isDeleteExpression(errorNode.parent)
    ) {
      return [];
    }

    const program = service.getLanguageService().getProgram()!;
    const checker = program.getTypeChecker();

    const type = checker.getTypeAtLocation(errorNode.expression);

    const typeDeclaration = getTypeDeclarationFromTypeSymbol(type);
    if (!typeDeclaration) {
      return [];
    }

    const sourceFile = typeDeclaration.getSourceFile();

    const typeName = getTypeNameFromType(type, checker); //'Person' as in 'Interface Person' or 'Car' as in 'class Car'
    const typeMemberName = errorNode.name.getText(); //'name' as in 'delete person.name' or 'make' as in 'delete car.make';

    if (!typeMemberName || !typeName || !sourceFile) {
      return [];
    }

    let nameEnd;
    if (type.isClass()) {
      const classMemberDeclaration = findClassMemberDeclaration(
        sourceFile,
        typeName,
        typeMemberName
      );
      nameEnd =
        classMemberDeclaration && (classMemberDeclaration as PropertyDeclaration).name.getEnd();
    } else {
      const typeMemberDeclaration = findTypeMemberDeclaration(sourceFile, typeName, typeMemberName);
      nameEnd = typeMemberDeclaration && (typeMemberDeclaration as PropertySignature).name.getEnd();
    }

    if (!nameEnd) {
      return [];
    }

    const updatedText = insertIntoText(sourceFile.text, nameEnd, OPTIONAL_TOKEN);

    return getCodemodData(sourceFile, updatedText, nameEnd, OPTIONAL_TOKEN, 'add');
  };
}

function findClassMemberDeclaration(
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

function findTypeMemberDeclaration(
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
