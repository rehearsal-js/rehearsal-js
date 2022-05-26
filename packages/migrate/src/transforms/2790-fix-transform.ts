import ts from 'typescript';

import FixTransform, { FixedFile } from '../interfaces/fix-transform';
import { findNodeAtPosition, insertIntoText } from '../helpers/typescript-ast';
import {
  getClassByName,
  getInterfaceByName,
  getImportByName,
  getSourceFileFromImport,
  getClassMemberByName,
  getInterfaceMemberByName,
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
    const typeMemberName = errorNode.name.getFullText(); //'name' as in 'delete person.name' or 'make' as in 'delete car.make';
    const typeName = type.getSymbol()?.getName().trim(); // 'Person' as in "interface Person" or 'Car' as in 'class Car'

    if (!typeMemberName || !typeName || !type.isClassOrInterface()) {
      return [];
    }

    if (type.isClass()) {
      return updateTextWithOptionalClassMember(diagnostic.file, service, typeMemberName, typeName);
    }
    return updateTextWithOptionalTypeMember(diagnostic.file, service, typeMemberName, typeName);
  };
}

function optionalTypeMember(
  sourceFile: ts.SourceFile,
  declaration: ts.InterfaceDeclaration,
  typeMemberName: string
): FixedFile[] {
  const matchedMember = getInterfaceMemberByName(declaration, typeMemberName);

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
  service: RehearsalService,
  typeMemberName: string,
  typeName: string
): FixedFile[] {
  const matchedInterface: ts.InterfaceDeclaration | undefined = getInterfaceByName(
    sourceFile,
    typeName
  );
  const matchedImport: ts.ImportDeclaration | undefined = getImportByName(sourceFile, typeName);

  if (matchedInterface) {
    return optionalTypeMember(sourceFile, matchedInterface, typeMemberName);
  } else if (matchedImport) {
    const importedSourceFile = getSourceFileFromImport(matchedImport, sourceFile.fileName, service);

    if (!importedSourceFile || !ts.isSourceFile(importedSourceFile)) {
      return [];
    }

    return updateTextWithOptionalTypeMember(importedSourceFile, service, typeMemberName, typeName);
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
  service: RehearsalService,
  memberName: string,
  typeName: string
): FixedFile[] {
  const matchedClass: ts.ClassDeclaration | undefined = getClassByName(sourceFile, typeName);
  const matchedImport: ts.ImportDeclaration | undefined = getImportByName(sourceFile, typeName);

  if (matchedClass) {
    return optionalClassMember(sourceFile, matchedClass, memberName);
  } else if (matchedImport) {
    const importedSourceFile = getSourceFileFromImport(matchedImport, sourceFile.fileName, service);

    if (!importedSourceFile || !ts.isSourceFile(importedSourceFile)) {
      return [];
    }
    return updateTextWithOptionalClassMember(importedSourceFile, service, memberName, typeName);
  } else {
    return [];
  }
}
