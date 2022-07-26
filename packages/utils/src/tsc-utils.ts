import ts from 'typescript';

export function getInterfaceByName(
  sourceFile: ts.SourceFile,
  typeName: string
): ts.InterfaceDeclaration | undefined {
  if (!typeName) {
    return undefined;
  }
  const matched = sourceFile.statements.find(
    (s) => ts.isInterfaceDeclaration(s) && s.name?.escapedText.toString().trim() === typeName.trim()
  );
  return matched as ts.InterfaceDeclaration;
}

export function getTypeAliasByName(
  sourceFile: ts.SourceFile,
  typeName: string
): ts.TypeAliasDeclaration | undefined {
  if (!typeName) {
    return undefined;
  }
  const matched = sourceFile.statements.find(
    (s) => ts.isTypeAliasDeclaration(s) && s.name.escapedText.toString().trim() === typeName.trim()
  );
  return matched as ts.TypeAliasDeclaration;
}

export function getClassByName(
  sourceFile: ts.SourceFile,
  className: string
): ts.ClassDeclaration | undefined {
  if (!className) {
    return undefined;
  }
  const matched = sourceFile.statements.find(
    (s) => ts.isClassDeclaration(s) && s.name?.escapedText.toString().trim() === className.trim()
  );
  return matched as ts.ClassDeclaration;
}

export function getInterfaceMemberByName(
  declaration: ts.InterfaceDeclaration,
  typeMemberName: string
): ts.TypeElement | undefined {
  if (!typeMemberName) {
    return undefined;
  }
  return declaration.members.find(
    (member) =>
      (member.name as ts.Identifier)?.escapedText.toString().trim() === typeMemberName.trim()
  );
}

export function getTypeAliasMemberByName(
  declaration: ts.TypeAliasDeclaration,
  typeMemberName: string
): ts.TypeElement | undefined {
  if (!typeMemberName) {
    return undefined;
  }
  return (declaration.type as ts.TypeLiteralNode).members.find(
    (member) =>
      (member.name as ts.Identifier)?.escapedText.toString().trim() === typeMemberName.trim()
  );
}

export function getClassMemberByName(
  declaration: ts.ClassDeclaration,
  classMemberName: string
): ts.ClassElement | undefined {
  if (!classMemberName) {
    return undefined;
  }
  return declaration.members.find(
    (member) =>
      (member.name as ts.Identifier)?.escapedText.toString().trim() === classMemberName.trim()
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

export function getTypeNameFromVariable(
  node: ts.Node,
  checker: ts.TypeChecker
): string | undefined {
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
  if (!childTypeStr) {
    return false;
  }
  const parentTypeStr = checker.typeToString(parentType);
  return parentTypeStr.includes(childTypeStr);
}

export function getTypeDeclarationFromTypeSymbol(type: ts.Type): ts.Node | undefined {
  const declarations = type.getSymbol()?.getDeclarations();
  let declarationStatement;
  if (declarations && declarations[0]) {
    const declaration = declarations[0];
    const kind = declaration.kind;
    /**
     * For type alias, declaration returned is '{name: string};' of 'type T1 = {name: string};'.
     * So we need to return its parent, which is the entire statement.
     */
    declarationStatement =
      kind === ts.SyntaxKind.TypeLiteral ? (declaration as ts.TypeLiteralNode).parent : declaration;
  }
  return declarationStatement;
}

export function isTypeMatched(typeString: string, type: ts.Type): boolean {
  typeString = typeString.trim();
  if (type.symbol?.escapedName.toString().trim() === typeString) {
    return true;
  } else if (type.aliasSymbol?.escapedName.toString().trim() === typeString) {
    return true;
  }
  return false;
}
