import { BaseCodeFixCollection } from './base-codefix-collection.js';
import { CodeFixesProvider } from './codefixes-provider.js';
import { TypescriptCodeFixCollection } from './typescript-codefix-collection.js';

import { AddErrorTypeGuardCodeFix } from './fixes/addErrorTypeGuard/index.js';
import { AddMissingExportCodeFix } from './fixes/addMissingExport/index.js';
import { MakeMemberOptionalCodeFix } from './fixes/makeMemberOptional/index.js';
import { AddMissingTypesBasedOnInheritanceCodeFix } from './fixes/addMissingTypesBasedOnInheritance/index.js';

export const codefixes = new CodeFixesProvider([
  new BaseCodeFixCollection({
    18046: new AddErrorTypeGuardCodeFix(),
    2571: new AddErrorTypeGuardCodeFix(),
    2790: new MakeMemberOptionalCodeFix(),
    4082: new AddMissingExportCodeFix(),
  }),
  new TypescriptCodeFixCollection(),
  new BaseCodeFixCollection({
    7006: new AddMissingTypesBasedOnInheritanceCodeFix(),
  }),
]);
