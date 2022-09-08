import { findNodeAtPosition, isSourceCodeChanged, transformDiagnosedNode } from '@rehearsal/utils';
import type { DiagnosticWithLocation, Node } from 'typescript';
import { isImportDeclaration, isImportSpecifier } from 'typescript';

import { type FixedFile, FixTransform, getCodemodData } from '../fix-transform';

export class FixTransform6133 extends FixTransform {
  fix = (diagnostic: DiagnosticWithLocation): FixedFile[] => {
    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
    const textRemoved = errorNode && errorNode.getFullText();

    const text = transformDiagnosedNode(diagnostic, (node: Node) => {
      if (isImportDeclaration(node) || isImportSpecifier(node)) {
        // Remove all export declarations and undefined imported functions
        return undefined;
      }

      return node;
    });

    const hasChanged = isSourceCodeChanged(diagnostic.file.getFullText(), text);
    if (!hasChanged) {
      return [];
    }
    return getCodemodData(diagnostic.file, text, diagnostic.start, textRemoved, 'delete');
  };
}
