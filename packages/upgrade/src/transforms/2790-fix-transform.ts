import ts from 'typescript';

import { type RehearsalService } from '@rehearsal/service';
import { FixResult } from '@rehearsal/reporter';

import { FixTransform } from '../interfaces/fix-transform';
import { getLocation } from '../helpers/transform-utils';

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

import { findNodeAtPosition, insertIntoText } from '../helpers/typescript-ast';
import { DataAggregator } from '@rehearsal/reporter';

const OPTIONAL_TOKEN = '?';

export class FixTransform2790 extends FixTransform {
  hint = `The operand of a 'delete' operator must be optional.`;

  fix = (diagnostic: ts.DiagnosticWithLocation, service: RehearsalService): FixResult => {
    this.dataAggregator = DataAggregator.getInstance(diagnostic);

    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
    if (
      !errorNode ||
      !ts.isPropertyAccessExpression(errorNode) ||
      !ts.isDeleteExpression(errorNode.parent)
    ) {
      return this.dataAggregator.getResult();
    }

    const program = service.getLanguageService().getProgram()!;
    const checker = program.getTypeChecker();

    const type = checker.getTypeAtLocation(errorNode.expression);

    const typeDeclaration = getTypeDeclarationFromTypeSymbol(type);
    if (!typeDeclaration) {
      return this.dataAggregator.getResult();
    }

    const sourceFile = typeDeclaration.getSourceFile();

    const typeName = getTypeNameFromType(type, checker); //'Person' as in 'Interface Person' or 'Car' as in 'class Car'
    const typeMemberName = errorNode.name.getFullText(); //'name' as in 'delete person.name' or 'make' as in 'delete car.make';

    if (!typeMemberName || !typeName || !sourceFile) {
      return this.dataAggregator.getResult();
    }

    let memberDeclaration;
    if (type.isClass()) {
      memberDeclaration = findClassMemberDeclaration(sourceFile, typeName, typeMemberName);
      // return updateTextWithOptionalClassMember(
      //   sourceFile,
      //   typeMemberName,
      //   typeName,
      //   this.dataAggregator.getResult()
      // );
    } else {
      memberDeclaration = findTypeMemberDeclaration(sourceFile, typeName, typeMemberName);
    }
    // memberDeclaration = findTypeMemberDeclaration(sourceFile, typeName, typeMemberName);
    if (!memberDeclaration){
      return this.dataAggregator.getResult();
    }

    const nameEnd = (memberDeclaration as ts.PropertySignature).name.getEnd();
    const updatedText = insertIntoText(sourceFile.getFullText(), nameEnd, OPTIONAL_TOKEN);
    const location = getLocation(sourceFile, nameEnd);
    this.dataAggregator.addCodemodDataToResult(sourceFile.fileName, updatedText, OPTIONAL_TOKEN, ['modified'], location);
    return this.dataAggregator.getResult();
    // return updateTextWithOptionalTypeMember(
    //   sourceFile,
    //   typeMemberName,
    //   typeName,
    //   this.dataAggregator.getResult()
    // );
  };
}

// function optionalTypeMember(
//   // diagnostic: ts.DiagnosticWithLocation,
//   sourceFile: ts.SourceFile,
//   declaration: ts.InterfaceDeclaration | ts.TypeAliasDeclaration,
//   typeMemberName: string,
//   result: FixResult
// ): FixResult {
//   let matchedMember;
//   if (ts.isInterfaceDeclaration(declaration)) {
//     matchedMember = getInterfaceMemberByName(declaration, typeMemberName);
//   } else {
//     matchedMember = getTypeAliasMemberByName(declaration, typeMemberName);
//   }

//   if (!matchedMember) {
//     return result;
//   }

//   const nameEnd = (matchedMember as ts.PropertySignature).name.getEnd();
//   const updatedText = insertIntoText(sourceFile.getFullText(), nameEnd, OPTIONAL_TOKEN);
//   // const { line, character } = ts.getLineAndCharacterOfPosition(sourceFile, nameEnd);
//   const location = getLocation(sourceFile, nameEnd);
//   return addCodemodDataToResult(result, sourceFile.fileName, updatedText, OPTIONAL_TOKEN, ['tracedFile', 'added'], location);
// }

// function updateTextWithOptionalTypeMember(
//   // diagnostic: ts.DiagnosticWithLocation,
//   sourceFile: ts.SourceFile,
//   typeMemberName: string,
//   typeName: string,
//   result: FixResult,
// ): FixResult {
//   const matchedInterface: ts.InterfaceDeclaration | undefined = getInterfaceByName(
//     sourceFile,
//     typeName
//   );
//   const matchedTypeAlias: ts.TypeAliasDeclaration | undefined = getTypeAliasByName(
//     sourceFile,
//     typeName
//   );

//   if (matchedInterface) {
//     return optionalTypeMember(sourceFile, matchedInterface, typeMemberName, result);
//   } else if (matchedTypeAlias) {
//     return optionalTypeMember(sourceFile, matchedTypeAlias, typeMemberName, result);
//   } else {
//     return result;
//   }
// }

// function optionalClassMember(
//   sourceFile: ts.SourceFile,
//   matchedClass: ts.ClassDeclaration,
//   typeMemberName: string,
//   result: FixResult
// ): FixResult {
//   const matchedMember = getClassMemberByName(matchedClass, typeMemberName);
//   if (!matchedMember) {
//     return result;
//   }

//   const nameEnd = (matchedMember as ts.PropertyDeclaration).name.getEnd();
//   const updatedText = insertIntoText(sourceFile.getFullText(), nameEnd, OPTIONAL_TOKEN);
//   const location = getLocation(sourceFile, nameEnd);
//   return addCodemodDataToResult(result, sourceFile.fileName, updatedText, OPTIONAL_TOKEN, ['tracedFile', 'added'], location);
// }

// function updateTextWithOptionalClassMember(
//   sourceFile: ts.SourceFile,
//   typeName: string,
//   memberName: string
//   result: FixResult
// ): FixResult {
//   const matchedClass: ts.ClassDeclaration | undefined = getClassByName(sourceFile, typeName);

//   if (matchedClass) {
//     return optionalClassMember(sourceFile, matchedClass, memberName, result);
//   } else {
//     return result;
//   }
// }

function findClassMemberDeclaration(sourceFile: ts.SourceFile, typeName: string, memberName: string): ts.PropertyDeclaration | undefined {
  let matchedMember;
  const matchedClass = getClassByName(sourceFile, typeName);
  if (matchedClass){
    matchedMember = getClassMemberByName(matchedClass, memberName);
  }
  return matchedMember as ts.PropertyDeclaration;
}

function findTypeMemberDeclaration(sourceFile: ts.SourceFile, typeName: string, memberName: string) {
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
