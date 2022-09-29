import { findNodeAtPosition } from '@rehearsal/utils';
import type { DiagnosticWithLocation } from 'typescript';
import { isImportDeclaration, isImportSpecifier } from 'typescript';

import { type FixedFile, FixTransform, getCodemodData } from '../fix-transform';

export class FixTransform6133 extends FixTransform {
  fix = (diagnostic: DiagnosticWithLocation): FixedFile[] => {
    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);

    if (errorNode && (isImportDeclaration(errorNode) || isImportSpecifier(errorNode))) {
      const textDeleted = errorNode.getFullText();
      const originalText = diagnostic.file.getFullText();

      const updatedText = `${originalText.substring(0, diagnostic.start)}${originalText.substring(
        diagnostic.start + textDeleted.length
      )}`;
      return getCodemodData(diagnostic.file, updatedText, diagnostic.start, textDeleted, 'delete');
    } else {
      return [];
    }
  };
}
