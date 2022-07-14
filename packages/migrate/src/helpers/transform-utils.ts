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

export function getTypeNameFromType(type: ts.Type, checker: ts.TypeChecker): string | undefined {
  const symbol = type.getSymbol();
  if (!symbol) {
    return undefined;
  }
  let typeName: string | undefined = symbol.getName().trim();

  if (typeName === 'default') {
    //"import Student from './student'";
    const fullyQualifiedName = checker.getFullyQualifiedName(symbol).trim();
    const parts = fullyQualifiedName.split('.');
    typeName = parts.pop();
  } else if (typeName === '__type') {
    // "type Student = {name: string}"
    typeName = type.aliasSymbol?.getName().trim();
  }
  return typeName;
}

export function getTypeNameFromVariable(node: ts.Node, program: ts.Program): string | undefined {
  const checker = program.getTypeChecker();
  const type = checker.getTypeAtLocation(node);
  if (!type) {
    return undefined;
  }
  if (type.isNumberLiteral()) {
    return 'number';
  }
  if (type.isStringLiteral()) {
    return 'string';
  }
  return checker.typeToString(type);
}

export function isSubtypeOf(
  childTypeStr: string,
  parentType: ts.Type,
  checker: ts.TypeChecker
): boolean {
  const parentTypeStr = checker.typeToString(parentType);
  return parentTypeStr.includes(childTypeStr);
}

export function getTypeDeclarationFromTypeSymbol(type: ts.Type): ts.Node | undefined {
  const declarations = type.getSymbol()?.getDeclarations();
  return declarations ? declarations[0] : undefined;
}

export function findNodeByText(node: ts.Node, text: string): ts.Node | undefined {
  const children = Array.from(node.getChildren());
  for (const child of children) {
    if (child.getFullText().trim() === text) {
      return child;
    } else if (child.getFullText().trim().includes(text)) {
      return findNodeByText(child, text);
    }
  }
  return undefined;
}

export function isTypeMatched(typeString: string, type: ts.Type): boolean {
  if (type.getSymbol()?.getName().trim() === typeString.trim()) {
    return true;
  }
  return false;
}
