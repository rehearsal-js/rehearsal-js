import { applyTextChange, normalizeTextChanges } from '@rehearsal/ts-utils';
import { BaseCodeFixCollection } from './base-codefix-collection.js';
import { CodeFixesProvider } from './codefixes-provider.js';
import { TypescriptCodeFixCollection } from './typescript-codefix-collection.js';

import { AddErrorTypeGuardCodeFix } from './fixes/addErrorTypeGuard.js';
import { AddMissingExportCodeFix } from './fixes/addMissingExport.js';
import { MakeMemberOptionalCodeFix } from './fixes/makeMemberOptional.js';
import { AddMissingTypesBasedOnInheritanceCodeFix } from './fixes/addMissingTypesBasedOnInheritance.js';
import { AddMissingTypesBasedOnInlayHintsCodeFix } from './fixes/addMissingTypesBasedOnInlayHints.js';
import type { CodeFixAction } from 'typescript';

export const codefixes = new CodeFixesProvider([
  new BaseCodeFixCollection([
    new AddErrorTypeGuardCodeFix(),
    new AddMissingExportCodeFix(),
    new AddMissingTypesBasedOnInheritanceCodeFix(),
    new AddMissingTypesBasedOnInlayHintsCodeFix(),
    new MakeMemberOptionalCodeFix(),
  ]),
  new TypescriptCodeFixCollection(),
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
