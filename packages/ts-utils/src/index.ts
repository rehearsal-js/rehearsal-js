export {
  getInterfaceByName,
  getTypeAliasByName,
  getClassByName,
  getInterfaceMemberByName,
  getTypeAliasMemberByName,
  getClassMemberByName,
  getTypeNameFromType,
  getTypeNameFromVariable,
  isSubtypeOf,
  getTypeDeclarationFromTypeSymbol,
  isTypeMatched,
} from './tsc-utils.js';

export * from './helpers/strings.js';
export * from './helpers/typescript-ast.js';
export * from './text-changes.js';
