import { BaseCodeFixCollection } from './base-codefix-collection';
import { CodeFixesProvider } from './codefixes-provider';
import { TypescriptCodeFixCollection } from './typescript-codefix-collection';

import { AddErrorTypeGuardCodeFix } from './fixes/addErrorTypeGuard';
import { AddMissingExportCodeFix } from './fixes/addMissingExport';
import { MakeMemberOptionalCodeFix } from './fixes/makeMemberOptional';

export const codefixes = new CodeFixesProvider([
  new BaseCodeFixCollection({
    18046: new AddErrorTypeGuardCodeFix(),
    2571: new AddErrorTypeGuardCodeFix(),
    2790: new MakeMemberOptionalCodeFix(),
    4082: new AddMissingExportCodeFix(),
  }),
  new TypescriptCodeFixCollection(),
]);
