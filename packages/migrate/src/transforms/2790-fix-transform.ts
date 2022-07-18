import ts from 'typescript';

import FixTransform, { FixedFile } from '../interfaces/fix-transform';
import { findNodeAtPosition, insertIntoText } from '../helpers/typescript-ast';
import {
  getClassByName,
  getInterfaceByName,
  getClassMemberByName,
  getInterfaceMemberByName,
  getTypeAliasByName,
  getTypeAliasMemberByName,
  getTypeNameFromType,
  getTypeDeclarationFromTypeSymbol,
} from '../helpers/transform-utils';
import type RehearsalService from '../rehearsal-service';

const OPTIONAL_TOKEN = '?';

export default class FixTransform2790 extends FixTransform {
  hint = `The operand of a 'delete' operator must be optional.`;

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

    if (type.isClass()) {
      return updateTextWithOptionalClassMember(sourceFile, typeMemberName, typeName);
    }
    return updateTextWithOptionalTypeMember(sourceFile, typeMemberName, typeName);
  };
}

function optionalTypeMember(
  sourceFile: ts.SourceFile,
  declaration: ts.InterfaceDeclaration | ts.TypeAliasDeclaration,
  typeMemberName: string
): FixedFile[] {
  let matchedMember;
  if (ts.isInterfaceDeclaration(declaration)) {
    matchedMember = getInterfaceMemberByName(declaration, typeMemberName);
  } else {
    matchedMember = getTypeAliasMemberByName(declaration, typeMemberName);
  }

  if (!matchedMember) {
    return [];
  }

  const nameEnd = (matchedMember as ts.PropertySignature).name.getEnd();
  const updatedText = insertIntoText(sourceFile.getFullText(), nameEnd, OPTIONAL_TOKEN);
  return [
    {
      fileName: sourceFile.fileName,
      text: updatedText,
    },
  ];
}

function updateTextWithOptionalTypeMember(
  sourceFile: ts.SourceFile,
  typeMemberName: string,
  typeName: string
): FixedFile[] {
  const matchedInterface: ts.InterfaceDeclaration | undefined = getInterfaceByName(
    sourceFile,
    typeName
  );
  const matchedTypeAlias: ts.TypeAliasDeclaration | undefined = getTypeAliasByName(
    sourceFile,
    typeName
  );

  if (matchedInterface) {
    return optionalTypeMember(sourceFile, matchedInterface, typeMemberName);
  } else if (matchedTypeAlias) {
    return optionalTypeMember(sourceFile, matchedTypeAlias, typeMemberName);
  } else {
    return [];
  }
}

function optionalClassMember(
  sourceFile: ts.SourceFile,
  matchedClass: ts.ClassDeclaration,
  typeMemberName: string
): FixedFile[] {
  const matchedMember = getClassMemberByName(matchedClass, typeMemberName);
  if (!matchedMember) {
    return [];
  }

  const nameEnd = (matchedMember as ts.PropertyDeclaration).name.getEnd();
  const updatedText = insertIntoText(sourceFile.getFullText(), nameEnd, OPTIONAL_TOKEN);
  return [
    {
      fileName: sourceFile.fileName,
      text: updatedText,
    },
  ];
}

function updateTextWithOptionalClassMember(
  sourceFile: ts.SourceFile,
  memberName: string,
  typeName: string
): FixedFile[] {
  const matchedClass: ts.ClassDeclaration | undefined = getClassByName(sourceFile, typeName);

  if (matchedClass) {
    return optionalClassMember(sourceFile, matchedClass, memberName);
  } else {
    return [];
  }
}
