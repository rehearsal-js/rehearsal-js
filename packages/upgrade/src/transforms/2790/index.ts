import ts from 'typescript';

import { type RehearsalService } from '@rehearsal/service';

import { FixTransform, type FixedFile, getCodemodResult } from '@rehearsal/plugins';
import {
  findNodeAtPosition,
  insertIntoText,
  getClassByName,
  getInterfaceByName,
  getClassMemberByName,
  getInterfaceMemberByName,
  getTypeAliasByName,
  getTypeAliasMemberByName,
  getTypeNameFromType,
  getTypeDeclarationFromTypeSymbol,
} from '@rehearsal/utils';

const OPTIONAL_TOKEN = '?';

export class FixTransform2790 extends FixTransform {
  fix = (diagnostic: ts.DiagnosticWithLocation, service: RehearsalService): FixedFile[] => {
    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
    if (
      !errorNode ||
      !ts.isPropertyAccessExpression(errorNode) ||
      !ts.isDeleteExpression(errorNode.parent)
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
    const typeMemberName = errorNode.name.getFullText(); //'name' as in 'delete person.name' or 'make' as in 'delete car.make';

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
        classMemberDeclaration && (classMemberDeclaration as ts.PropertyDeclaration).name.getEnd();
    } else {
      const typeMemberDeclaration = findTypeMemberDeclaration(sourceFile, typeName, typeMemberName);
      nameEnd =
        typeMemberDeclaration && (typeMemberDeclaration as ts.PropertySignature).name.getEnd();
    }

    if (!nameEnd) {
      return [];
    }

    const updatedText = insertIntoText(sourceFile.getFullText(), nameEnd, OPTIONAL_TOKEN);

    return getCodemodResult(sourceFile, updatedText, nameEnd);
  };
}

function findClassMemberDeclaration(
  sourceFile: ts.SourceFile,
  typeName: string,
  memberName: string
): ts.PropertyDeclaration | undefined {
  let matchedMember;
  const matchedClass = getClassByName(sourceFile, typeName);
  if (matchedClass) {
    matchedMember = getClassMemberByName(matchedClass, memberName);
  }
  return matchedMember as ts.PropertyDeclaration;
}

function findTypeMemberDeclaration(
  sourceFile: ts.SourceFile,
  typeName: string,
  memberName: string
): ts.TypeElement | undefined {
  const matchedInterface: ts.InterfaceDeclaration | undefined = getInterfaceByName(
    sourceFile,
    typeName
  );
  const matchedTypeAlias: ts.TypeAliasDeclaration | undefined = getTypeAliasByName(
    sourceFile,
    typeName
  );

  const matchedType = matchedInterface || matchedTypeAlias;
  let matchedMember;
  if (matchedType && ts.isInterfaceDeclaration(matchedType)) {
    matchedMember = getInterfaceMemberByName(matchedType, memberName);
  } else if (matchedType) {
    matchedMember = getTypeAliasMemberByName(matchedType, memberName);
  }
  return matchedMember;
}
