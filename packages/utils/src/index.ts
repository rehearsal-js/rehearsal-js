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

export * from './helpers/index.js';
export * from './text-changes.js';
export * from './cli.js';
