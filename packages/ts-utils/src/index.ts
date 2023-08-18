export {
  getInterfaceByName,
  getTypeAliasByName,
  getClassByName,
  getInterfaceMemberByName,
  getTypeAliasMemberByName,
  getClassMemberByName,
  getPositionFromClosingParenPosition,
  getTypeNameFromType,
  getTypeNameFromVariable,
  isSubtypeOf,
  getTypeDeclarationFromTypeSymbol,
  isTypeMatched,
  getTSConfigCompilerOptionsCanonical,
  type TSConfigCompilerOptions,
} from './tsc-utils.js';

export * from './helpers/strings.js';
export * from './helpers/typescript-ast.js';
export * from './text-changes.js';
