import type {
  ClassDeclaration,
  ClassElement,
  Identifier,
  InterfaceDeclaration,
  Node,
  SourceFile,
  Type,
  TypeAliasDeclaration,
  TypeChecker,
  TypeElement,
  TypeLiteralNode,
} from 'typescript';
import {
  isClassDeclaration,
  isInterfaceDeclaration,
  isTypeAliasDeclaration,
  SyntaxKind,
} from 'typescript';

export function getInterfaceByName(
  sourceFile: SourceFile,
  typeName: string
): InterfaceDeclaration | undefined {
  if (!typeName) {
    return undefined;
  }
  const matched = sourceFile.statements.find(
    (s) => isInterfaceDeclaration(s) && s.name?.escapedText.toString().trim() === typeName.trim()
  );
  return matched as InterfaceDeclaration;
}

export function getTypeAliasByName(
  sourceFile: SourceFile,
  typeName: string
): TypeAliasDeclaration | undefined {
  if (!typeName) {
    return undefined;
  }
  const matched = sourceFile.statements.find(
    (s) => isTypeAliasDeclaration(s) && s.name.escapedText.toString().trim() === typeName.trim()
  );
  return matched as TypeAliasDeclaration;
}

export function getClassByName(
  sourceFile: SourceFile,
  className: string
): ClassDeclaration | undefined {
  if (!className) {
    return undefined;
  }
  const matched = sourceFile.statements.find(
    (s) => isClassDeclaration(s) && s.name?.escapedText.toString().trim() === className.trim()
  );
  return matched as ClassDeclaration;
}

export function getInterfaceMemberByName(
  declaration: InterfaceDeclaration,
  typeMemberName: string
): TypeElement | undefined {
  if (!typeMemberName) {
    return undefined;
  }
  return declaration.members.find(
    (member) => (member.name as Identifier)?.escapedText.toString().trim() === typeMemberName.trim()
  );
}

export function getTypeAliasMemberByName(
  declaration: TypeAliasDeclaration,
  typeMemberName: string
): TypeElement | undefined {
  if (!typeMemberName) {
    return undefined;
  }
  return (declaration.type as TypeLiteralNode).members.find(
    (member) => (member.name as Identifier)?.escapedText.toString().trim() === typeMemberName.trim()
  );
}

export function getClassMemberByName(
  declaration: ClassDeclaration,
  classMemberName: string
): ClassElement | undefined {
  if (!classMemberName) {
    return undefined;
  }
  return declaration.members.find(
    (member) =>
      (member.name as Identifier)?.escapedText.toString().trim() === classMemberName.trim()
  );
}

export function getTypeNameFromType(type: Type, checker: TypeChecker): string | undefined {
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

export function getTypeNameFromVariable(node: Node, checker: TypeChecker): string | undefined {
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

export function isSubtypeOf(childTypeStr: string, parentType: Type, checker: TypeChecker): boolean {
  if (!childTypeStr) {
    return false;
  }
  const parentTypeStr = checker.typeToString(parentType);
  return parentTypeStr.includes(childTypeStr);
}

export function getTypeDeclarationFromTypeSymbol(type: Type): Node | undefined {
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
      kind === SyntaxKind.TypeLiteral ? (declaration as TypeLiteralNode).parent : declaration;
  }
  return declarationStatement;
}

export function isTypeMatched(typeString: string, type: Type): boolean {
  typeString = typeString.trim();
  if (type.symbol?.escapedName.toString().trim() === typeString) {
    return true;
  } else if (type.aliasSymbol?.escapedName.toString().trim() === typeString) {
    return true;
  }
  return false;
}
