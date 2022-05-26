import ts from 'typescript';

import type RehearsalService from '../rehearsal-service';

export function getInterfaceByName(
  sourceFile: ts.SourceFile,
  typeName: string
): ts.InterfaceDeclaration | undefined {
  const matched = sourceFile.statements.find(
    (s) => ts.isInterfaceDeclaration(s) && s.name.getFullText().trim() === typeName
  );
  return matched as ts.InterfaceDeclaration;
}

export function getImportByName(
  sourceFile: ts.SourceFile,
  typeName: string
): ts.ImportDeclaration | undefined {
  const matched = sourceFile.statements.find(
    (s) =>
      ts.isImportDeclaration(s) &&
      (s.importClause?.namedBindings as ts.NamedImports).elements.find(
        (e) => e.name.getFullText().trim() === typeName
      )
  );
  return matched as ts.ImportDeclaration;
}

export function getClassByName(
  sourceFile: ts.SourceFile,
  className: string
): ts.ClassDeclaration | undefined {
  const matched = sourceFile.statements.find(
    (s) => ts.isClassDeclaration(s) && s.name?.getFullText().trim() === className
  );
  return matched as ts.ClassDeclaration;
}

export function getSourceFileFromImport(
  declaration: ts.ImportDeclaration,
  importingFile: string,
  service: RehearsalService
): ts.SourceFile | undefined {
  const module = declaration.moduleSpecifier.getFullText().trim().replace(/^'|'$/g, '');
  const fileName = service.resolveModuleName(module, importingFile);
  if (fileName) {
    const sourceFile = service.getSourceFile(fileName);
    return sourceFile;
  }
}

export function getInterfaceMemberByName(
  declaration: ts.InterfaceDeclaration,
  typeMemberName: string
): ts.TypeElement | undefined {
  return declaration.members.find((member) => member.name?.getFullText().trim() === typeMemberName);
}

export function getClassMemberByName(
  declaration: ts.ClassDeclaration,
  classMemberName: string
): ts.ClassElement | undefined {
  return declaration.members.find(
    (member) => member.name?.getFullText().trim() === classMemberName
  );
}
