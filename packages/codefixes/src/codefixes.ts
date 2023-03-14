import { applyTextChange, normalizeTextChanges } from '@rehearsal/ts-utils';
import { BaseCodeFixCollection } from './base-codefix-collection.js';
import { CodeFixesProvider } from './codefixes-provider.js';
import { TypescriptCodeFixCollection } from './typescript-codefix-collection.js';
import { Diagnostics } from './diagnosticInformationMap.generated.js';

import { AddErrorTypeGuardCodeFix } from './fixes/addErrorTypeGuard/index.js';
import { AddMissingExportCodeFix } from './fixes/addMissingExport/index.js';
import { MakeMemberOptionalCodeFix } from './fixes/makeMemberOptional/index.js';
import { AddMissingTypesBasedOnInheritanceCodeFix } from './fixes/addMissingTypesBasedOnInheritance/index.js';
import { AddMissingTypesBasedOnInlayHintsCodeFix } from './fixes/addMissingTypesBasedOnInlayHints/index.js';
import type { CodeFixAction } from 'typescript';

export const codefixes = new CodeFixesProvider([
  new BaseCodeFixCollection({
    [Diagnostics._0_implicitly_has_an_1_return_type_but_a_better_type_may_be_inferred_from_usage
      .code]: new AddMissingTypesBasedOnInheritanceCodeFix(),
  }),
  new BaseCodeFixCollection({
    [Diagnostics._0_is_of_type_unknown.code]: new AddErrorTypeGuardCodeFix(),
    [Diagnostics.Object_is_of_type_unknown.code]: new AddErrorTypeGuardCodeFix(),
    [Diagnostics.The_operand_of_a_delete_operator_must_be_optional.code]:
      new MakeMemberOptionalCodeFix(),
    [Diagnostics.Default_export_of_the_module_has_or_is_using_private_name_0.code]:
      new AddMissingExportCodeFix(),
    [Diagnostics._0_implicitly_has_an_1_return_type_but_a_better_type_may_be_inferred_from_usage
      .code]: new AddMissingTypesBasedOnInlayHintsCodeFix(),
  }),
  new TypescriptCodeFixCollection(),
  new BaseCodeFixCollection({
    [Diagnostics.Parameter_0_implicitly_has_an_1_type.code]:
      new AddMissingTypesBasedOnInheritanceCodeFix(),
  }),
]);

export interface ContentDelegate {
  getText(filename: string): string;
  setText(filename: string, text: string): void;
  applyText?(newText: string): void;
}

export function applyCodeFix(fix: CodeFixAction, contentDelegate: ContentDelegate): void {
  for (const fileTextChange of fix.changes) {
    let text = contentDelegate.getText(fileTextChange.fileName);

    const textChanges = normalizeTextChanges([...fileTextChange.textChanges]);
    for (const textChange of textChanges) {
      text = applyTextChange(text, textChange);
      contentDelegate.applyText?.(text);
    }

    contentDelegate.setText(fileTextChange.fileName, text);
  }
}
