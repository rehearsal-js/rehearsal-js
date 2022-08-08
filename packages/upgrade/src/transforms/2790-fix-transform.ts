import ts from 'typescript';

import { type RehearsalService } from '@rehearsal/service';

import { FixTransform, type FixResult } from '@rehearsal/plugins';
import { getCommentsOnlyResult, getCodemodResult } from '@rehearsal/plugins';
import { findNodeAtPosition, insertIntoText } from '@rehearsal/utils';

import {
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
  hint = `The operand of a 'delete' operator must be optional.`;

  fix = (diagnostic: ts.DiagnosticWithLocation, service: RehearsalService): FixResult => {
    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
    if (
      !errorNode ||
      !ts.isPropertyAccessExpression(errorNode) ||
      !ts.isDeleteExpression(errorNode.parent)
    ) {
      return getCommentsOnlyResult(diagnostic);
    }

    const program = service.getLanguageService().getProgram()!;
    const checker = program.getTypeChecker();

    const type = checker.getTypeAtLocation(errorNode.expression);

    const typeDeclaration = getTypeDeclarationFromTypeSymbol(type);
    if (!typeDeclaration) {
      return getCommentsOnlyResult(diagnostic);
    }

    const sourceFile = typeDeclaration.getSourceFile();

    const typeName = getTypeNameFromType(type, checker); //'Person' as in 'Interface Person' or 'Car' as in 'class Car'
    const typeMemberName = errorNode.name.getFullText(); //'name' as in 'delete person.name' or 'make' as in 'delete car.make';

    if (!typeMemberName || !typeName || !sourceFile) {
      return getCommentsOnlyResult(diagnostic);
    }

    if (type.isClass()) {
      return updateTextWithOptionalClassMember(diagnostic, sourceFile, typeMemberName, typeName);
    }
    return updateTextWithOptionalTypeMember(diagnostic, sourceFile, typeMemberName, typeName);
  };
}

function optionalTypeMember(
  diagnostic: ts.DiagnosticWithLocation,
  sourceFile: ts.SourceFile,
  declaration: ts.InterfaceDeclaration | ts.TypeAliasDeclaration,
  typeMemberName: string
): FixResult {
  let matchedMember;
  if (ts.isInterfaceDeclaration(declaration)) {
    matchedMember = getInterfaceMemberByName(declaration, typeMemberName);
  } else {
    matchedMember = getTypeAliasMemberByName(declaration, typeMemberName);
  }

  if (!matchedMember) {
    return getCommentsOnlyResult(diagnostic);
  }

  const nameEnd = (matchedMember as ts.PropertySignature).name.getEnd();
  const updatedText = insertIntoText(sourceFile.getFullText(), nameEnd, OPTIONAL_TOKEN);
  return getCodemodResult(sourceFile, updatedText, nameEnd);
}

function updateTextWithOptionalTypeMember(
  diagnostic: ts.DiagnosticWithLocation,
  sourceFile: ts.SourceFile,
  typeMemberName: string,
  typeName: string
): FixResult {
  const matchedInterface: ts.InterfaceDeclaration | undefined = getInterfaceByName(
    sourceFile,
    typeName
  );
  const matchedTypeAlias: ts.TypeAliasDeclaration | undefined = getTypeAliasByName(
    sourceFile,
    typeName
  );

  if (matchedInterface) {
    return optionalTypeMember(diagnostic, sourceFile, matchedInterface, typeMemberName);
  } else if (matchedTypeAlias) {
    return optionalTypeMember(diagnostic, sourceFile, matchedTypeAlias, typeMemberName);
  } else {
    return getCommentsOnlyResult(diagnostic);
  }
}

function optionalClassMember(
  diagnostic: ts.DiagnosticWithLocation,
  sourceFile: ts.SourceFile,
  matchedClass: ts.ClassDeclaration,
  typeMemberName: string
): FixResult {
  const matchedMember = getClassMemberByName(matchedClass, typeMemberName);
  if (!matchedMember) {
    return getCommentsOnlyResult(diagnostic);
  }

  const nameEnd = (matchedMember as ts.PropertyDeclaration).name.getEnd();
  const updatedText = insertIntoText(sourceFile.getFullText(), nameEnd, OPTIONAL_TOKEN);
  return getCodemodResult(sourceFile, updatedText, nameEnd);
}

function updateTextWithOptionalClassMember(
  diagnostic: ts.DiagnosticWithLocation,
  sourceFile: ts.SourceFile,
  memberName: string,
  typeName: string
): FixResult {
  const matchedClass: ts.ClassDeclaration | undefined = getClassByName(sourceFile, typeName);

  if (matchedClass) {
    return optionalClassMember(diagnostic, sourceFile, matchedClass, memberName);
  } else {
    return getCommentsOnlyResult(diagnostic);
  }
}
