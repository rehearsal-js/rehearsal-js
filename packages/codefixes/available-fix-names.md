Typescript doesn't provide a functionality to get lists all of available fixIds or fixNames.
You can find hints on how to get those lists below.

### fixNames

The way to get all fixNames is to walk through TypeScript source code codefix files:
https://github.com/microsoft/TypeScript/tree/main/src/services/codefixes
and grab the value of the first argument of `createCodeFixAction`,
`createCodeFixActionWithoutFixAll` or `createCodeFixActionMaybeFixAll` function calls.

The next list ordered by filename to make it easy to update

```typescript
export const availableCodeFixNames = [
  'addConvertToUnknownForNonOverlappingTypes', // addConvertToUnknownForNonOverlappingTypes.ts
  'addEmptyExportDeclaration', // addEmptyExportDeclaration.ts
  'addMissingAsync', // addMissingAsync.ts
  'addMissingAwait', // addMissingAwait.ts
  'addMissingAwaitToInitializer', // addMissingAwait.ts
  'addMissingConst', // addMissingConst.ts
  'addMissingDeclareProperty', // addMissingDeclareProperty.ts
  'addMissingInvocationForDecorator', // addMissingInvocationForDecorator.ts
  'addNameToNamelessParameter', // addNameToNamelessParameter.ts
  'addOptionalPropertyUndefined', // addOptionalPropertyUndefined.ts
  'annotateWithTypeFromJSDoc', // annotateWithTypeFromJSDoc.ts
  'fixConvertConstToLet', // convertConstToLet.ts
  'convertFunctionToEs6Class', // convertFunctionToEs6Class.ts
  'convertLiteralTypeToMappedType', // convertLiteralTypeToMappedType.ts
  'convertToAsyncFunction', // convertToAsyncFunction.ts
  'convertToEsModule', // convertToEsModule.ts
  'fixConvertToMappedObjectType', // convertToMappedObjectType.ts
  'convertToTypeOnlyExport', // convertToTypeOnlyExport.ts
  'convertToTypeOnlyImport', // convertToTypeOnlyImport.ts
  'correctQualifiedNameToIndexedAccessType', // correctQualifiedNameToIndexedAccessType.ts
  'disableJsDiagnostics', // disableJsDiagnostics.ts
  'addMissingConstraint', // fixAddMissingConstraint.ts
  'fixMissingProperties', // fixAddMissingMember.ts
  'fixMissingAttributes', // fixAddMissingMember.ts
  'fixMissingFunctionDeclaration', // fixAddMissingMember.ts
  'fixMissingMember', // fixAddMissingMember.ts
  'addMissingNewOperator', // fixAddMissingNewOperator.ts
  'fixIdAddMissingTypeof', // fixAddModuleReferTypeMissingTypeof.ts
  'addVoidToPromise', // fixAddVoidToPromise.ts
  'fixAwaitInSyncFunction', // fixAwaitInSyncFunction.ts
  'fixCannotFindModule', // fixCannotFindModule.ts
  'fixClassDoesntImplementInheritedAbstractMember', // fixClassDoesntImplementInheritedAbstractMember.ts
  'fixClassIncorrectlyImplementsInterface', // fixClassIncorrectlyImplementsInterface.ts
  'classSuperMustPrecedeThisAccess', // fixClassSuperMustPrecedeThisAccess.ts
  'constructorForDerivedNeedSuperCall', // fixConstructorForDerivedNeedSuperCall.ts
  'fixCannotFindModule', // fixCannotFindModule.ts
  'fixEnableJsxFlag', // fixEnableJsxFlag.ts
  'fixExpectedComma', // fixExpectedComma.ts
  'extendsInterfaceBecomesImplements', // fixExtendsInterfaceBecomesImplements.ts
  'forgottenThisPropertyAccess', // fixForgottenThisPropertyAccess.ts
  'fixImplicitThis', // fixImplicitThis.ts
  'fixImportNonExportedMember', // fixImportNonExportedMember.ts
  'fixIncorrectNamedTupleSyntax', // fixIncorrectNamedTupleSyntax.ts
  'invalidImportSyntax', // fixInvalidImportSyntax.ts
  'fixInvalidJsxCharacters_expression', // fixInvalidJsxCharacters.ts
  'fixInvalidJsxCharacters_htmlEntity', // fixInvalidJsxCharacters.ts
  'jdocTypes', // fixJSDocTypes.ts
  'fixMissingCallParentheses', // fixMissingCallParentheses.ts
  'fixModuleOption', // fixModuleAndTargetOptions.ts
  'fixTargetOption', // fixModuleAndTargetOptions.ts
  'fixNaNEquality', // fixNaNEquality.ts
  'fixNoPropertyAccessFromIndexSignature', // fixNoPropertyAccessFromIndexSignature.ts
  'fixOverrideModifier', // fixOverrideModifier.ts
  'fixPropertyAssignment', // fixPropertyAssignment.ts
  'fixPropertyOverrideAccessor', // fixPropertyOverrideAccessor.ts
  'fixReturnTypeInAsyncFunction', // fixReturnTypeInAsyncFunction.ts
  'spelling', // fixSpelling.ts
  'strictClassInitialization', // fixStrictClassInitialization.ts
  'deleteUnmatchedParameter', // fixUnmatchedParameter.ts
  'renameUnmatchedParameter', // fixUnmatchedParameter.ts
  'fixUnreachableCode', // fixUnreachableCode.ts
  'fixUnreferenceableDecoratorMetadata', // fixUnreferenceableDecoratorMetadata.ts
  'unusedIdentifier', // fixUnusedIdentifier.ts
  'fixUnusedLabel', // fixUnusedLabel.ts
  'import', // importFixes.ts
  'inferFromUsage', // inferFromUsage.ts
  'removeAccidentalCallParentheses', // removeAccidentalCallParentheses.ts
  'removeUnnecessaryAwait', // removeUnnecessaryAwait.ts
  'requireInTs', // requireInTs.ts
  'returnValueCorrect', // returnValueCorrect.ts
  'splitTypeOnlyImport', // splitTypeOnlyImport.ts
  'useBigintLiteral', // useBigintLiteral.ts
  'useDefaultImport', // useDefaultImport.ts
  'wrapJsxInFragment', // wrapJsxInFragment.ts
];
```

### fixIds to error codes map

You can find the map of all available fixIds with corresponding errors below.
To update the list, you can modify getSupportedErrorCodes function in typescript.js to:

```typescript
function getSupportedErrorCodes() {
  const fixIdMap = {};
  for (const fixId of fixIdToRegistration.keys()) {
    console.log(fixId);
    fixIdMap[fixId] = fixIdToRegistration.get(fixId).errorCodes;
  }
  return fixIdMap;

  return ts.arrayFrom(errorCodeToFixes.keys());
}
```

then create a .ts file with the content below and run it:

```typescript
import { getSupportedCodeFixes } from 'typescript';
const map = getSupportedCodeFixes();
console.log(map);
```

Don't forget to revert getSupportedErrorCodes content.

```typescript
export const codeFixIdToCodesMap: { [key: string]: number[] } = {
  addConvertToUnknownForNonOverlappingTypes: [2352],
  addMissingAsync: [2345, 2322, 2678],
  addMissingAwait: [
    2356, 2362, 2363, 2736, 2365, 2367, 2801, 2461, 2495, 2802, 2549, 2548, 2488, 2504, 2345, 2339,
    2349, 2351,
  ],
  addMissingConst: [2304, 18004],
  addMissingConstraint: [2678, 2719, 2375, 2322, 2379, 2530, 2603, 2344],
  addMissingDeclareProperty: [2612],
  addMissingInvocationForDecorator: [1329],
  addMissingNewOperator: [2348],
  addMissingPropertyDefiniteAssignmentAssertions: [2564],
  addMissingPropertyInitializer: [2564],
  addMissingPropertyUndefinedType: [2564],
  addNameToNamelessParameter: [7051],
  addOptionalPropertyUndefined: [2412, 2375, 2379],
  addVoidToPromise: [2810, 2794],
  annotateWithTypeFromJSDoc: [80004],
  classSuperMustPrecedeThisAccess: [17009],
  constructorForDerivedNeedSuperCall: [2377],
  convertFunctionToEs6Class: [80002],
  convertLiteralTypeToMappedType: [2690],
  convertToAsyncFunction: [80006],
  convertToTypeOnlyExport: [1205],
  convertToTypeOnlyImport: [1371],
  correctQualifiedNameToIndexedAccessType: [2713],
  deleteUnmatchedParameter: [8024],
  disableJsDiagnostics: [
    /** 1000+ codes which we don't interested in **/
  ],
  enableExperimentalDecorators: [1219],
  extendsInterfaceBecomesImplements: [2689],
  fixAddModuleReferTypeMissingTypeof: [1340],
  fixAddOverrideModifier: [4113, 4112, 4116, 4114, 4115, 4119, 4121, 4120, 4122],
  fixAddReturnStatement: [2355, 2322, 2345],
  fixAwaitInSyncFunction: [1308, 1103, 2311],
  fixClassDoesntImplementInheritedAbstractMember: [2515, 2653],
  fixClassIncorrectlyImplementsInterface: [2420, 2720],
  fixConvertConstToLet: [2588],
  fixConvertToMappedObjectType: [1337],
  fixEnableJsxFlag: [17004],
  fixExpectedComma: [1005],
  fixImplicitThis: [2683],
  fixImportNonExportedMember: [2459],
  fixIncorrectNamedTupleSyntax: [5086, 5087],
  fixInvalidJsxCharacters_expression: [1382, 1381],
  fixInvalidJsxCharacters_htmlEntity: [1382, 1381],
  fixJSDocTypes_nullable: [8020],
  fixJSDocTypes_plain: [8020],
  fixMissingAttributes: [2339, 2551, 2741, 2739, 2740, 2345, 2304],
  fixMissingCallParentheses: [2774],
  fixMissingFunctionDeclaration: [2339, 2551, 2741, 2739, 2740, 2345, 2304],
  fixMissingImport: [2304, 2552, 2663, 2662, 2503, 2686, 2693, 18004, 1361],
  fixMissingMember: [2339, 2551, 2741, 2739, 2740, 2345, 2304],
  fixMissingProperties: [2339, 2551, 2741, 2739, 2740, 2345, 2304],
  fixNaNEquality: [2845],
  fixNoPropertyAccessFromIndexSignature: [4111],
  fixOverrideModifier: [4113, 4112, 4116, 4114, 4115, 4119, 4121, 4120, 4122],
  fixPropertyAssignment: [1312],
  fixPropertyOverrideAccessor: [2610, 2611],
  fixRemoveBracesFromArrowFunctionBody: [2355, 2322, 2345],
  fixRemoveOverrideModifier: [4113, 4112, 4116, 4114, 4115, 4119, 4121, 4120, 4122],
  fixReturnTypeInAsyncFunction: [1064],
  fixSpelling: [2551, 2568, 2552, 2570, 2833, 2663, 2662, 2724, 4117, 4123, 2769, 2322],
  fixUnreachableCode: [7027],
  fixUnreferenceableDecoratorMetadata: [1272],
  fixUnusedLabel: [7028],
  fixWrapTheBlockWithParen: [2355, 2322, 2345],
  forgottenThisPropertyAccess: [2663, 1451, 2662],
  inferFromUsage: [
    7034, 7005, 7006, 7019, 7033, 7010, 7032, 7008, 7046, 7043, 7044, 7047, 7048, 7050, 7049, 7045,
    2683,
  ],
  installTypesPackage: [2307, 7016],
  removeAccidentalCallParentheses: [6234],
  removeUnnecessaryAwait: [80007],
  renameUnmatchedParameter: [8024],
  requireInTs: [80005],
  splitTypeOnlyImport: [1363],
  unusedIdentifier_delete: [6133, 6196, 6138, 6192, 6198, 6199, 6205],
  unusedIdentifier_deleteImports: [6133, 6196, 6138, 6192, 6198, 6199, 6205],
  unusedIdentifier_infer: [6133, 6196, 6138, 6192, 6198, 6199, 6205],
  unusedIdentifier_prefix: [6133, 6196, 6138, 6192, 6198, 6199, 6205],
  useBigintLiteral: [80008],
  useDefaultImport: [80003],
  wrapJsxInFragment: [2657],
};
```
