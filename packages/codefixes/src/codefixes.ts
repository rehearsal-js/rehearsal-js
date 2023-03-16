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
    [Diagnostics.TS7050.code]: new AddMissingTypesBasedOnInheritanceCodeFix(),
  }),
  new BaseCodeFixCollection({
    [Diagnostics.TS18046.code]: new AddErrorTypeGuardCodeFix(),
    [Diagnostics.TS2571.code]: new AddErrorTypeGuardCodeFix(),
    [Diagnostics.TS2790.code]: new MakeMemberOptionalCodeFix(),
    [Diagnostics.TS4082.code]: new AddMissingExportCodeFix(),
    [Diagnostics.TS7050.code]: new AddMissingTypesBasedOnInlayHintsCodeFix(),
  }),
  new TypescriptCodeFixCollection(),
  new BaseCodeFixCollection({
    [Diagnostics.TS7006.code]: new AddMissingTypesBasedOnInheritanceCodeFix(),
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
