import ts from 'typescript';

export function getInterfaceByName(
  sourceFile: ts.SourceFile,
  typeName: string
): ts.InterfaceDeclaration | undefined {
  const matched = sourceFile.statements.find(
    (s) => ts.isInterfaceDeclaration(s) && s.name.getFullText().trim() === typeName
  );
  return matched as ts.InterfaceDeclaration;
}

export function getTypeAliasByName(
  sourceFile: ts.SourceFile,
  typeName: string
): ts.TypeAliasDeclaration | undefined {
  const matched = sourceFile.statements.find(
    (s) => ts.isTypeAliasDeclaration(s) && s.name.getFullText().trim() === typeName
  );
  return matched as ts.TypeAliasDeclaration;
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

export function getInterfaceMemberByName(
  declaration: ts.InterfaceDeclaration,
  typeMemberName: string
): ts.TypeElement | undefined {
  return declaration.members.find((member) => member.name?.getFullText().trim() === typeMemberName);
}

export function getTypeAliasMemberByName(
  declaration: ts.TypeAliasDeclaration,
  typeMemberName: string
): ts.TypeElement | undefined {
  return (declaration.type as ts.TypeLiteralNode).members.find(
    (member) => member.name?.getFullText().trim() === typeMemberName
  );
}

export function getClassMemberByName(
  declaration: ts.ClassDeclaration,
  classMemberName: string
): ts.ClassElement | undefined {
  return declaration.members.find(
    (member) => member.name?.getFullText().trim() === classMemberName
  );
}

export function getTypeNameFromType(
  type: ts.Type,
  fullyQualifiedNameOfType: string
): string | undefined {
  let typeName: string | undefined = type.getSymbol()?.getName().trim();
  if (typeName === 'default') {
    //"import Student from './student'";
    const parts = fullyQualifiedNameOfType.split('.');
    typeName = parts.pop();
  } else if (typeName === '__type') {
    // "type Student = {name: string}"
    typeName = type.aliasSymbol?.getName().trim();
  }
  return typeName;
}

export function isTypeImported(fullyQualifiedNameOfType: string): boolean {
  const parts = fullyQualifiedNameOfType.split('.');
  const isTypeImported = parts.length > 1;
  return isTypeImported;
}
