import { applyTextChange, normalizeTextChanges } from '@rehearsal/ts-utils';
import { BaseCodeFixCollection } from './base-codefix-collection.js';
import { CodeFixesProvider } from './codefixes-provider.js';
import { TypescriptCodeFixCollection } from './typescript-codefix-collection.js';

import { AddErrorTypeGuardCodeFix } from './fixes/addErrorTypeGuard.js';
import { AddMissingArgToComponentSignature } from './fixes/glint/addMissingArgToComponentSignature.js';
import { AddMissingExportCodeFix } from './fixes/addMissingExport.js';
import { AddMissingTypesBasedOnInheritanceCodeFix } from './fixes/addMissingTypesBasedOnInheritance.js';
import { AddMissingReturnTypesCodeFix } from './fixes/addMissingReturnTypes.js';
import { AnnotateWithStrictTypeFromJSDoc } from './fixes/annotateWithStrictTypeFromJSDoc.js';
import { GlintCodeFixCollection } from './glint-codefix-collection.js';
import { MakeMemberOptionalCodeFix } from './fixes/makeMemberOptional.js';
import { StubMissingJSDocParamName } from './fixes/stubMissingJSDocParamName.js';
import type { CodeFixAction } from 'typescript';

export const codefixes = new CodeFixesProvider([
  new BaseCodeFixCollection([
    new AddErrorTypeGuardCodeFix(),
    new AddMissingExportCodeFix(),
    new AddMissingTypesBasedOnInheritanceCodeFix(),
    new AddMissingReturnTypesCodeFix(),
    new AnnotateWithStrictTypeFromJSDoc(),
    new MakeMemberOptionalCodeFix(),
    new StubMissingJSDocParamName(),
  ]),
  new TypescriptCodeFixCollection(),
]);

export const glintCodeFixes = new CodeFixesProvider([
  new BaseCodeFixCollection([
    new AddMissingReturnTypesCodeFix(),
    new AnnotateWithStrictTypeFromJSDoc(),
    new StubMissingJSDocParamName(),
  ]),
  new GlintCodeFixCollection(),
  new BaseCodeFixCollection([
    // Need to be run after standard "typedef to type" fix applied
    new AddMissingArgToComponentSignature(),
  ]),
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
