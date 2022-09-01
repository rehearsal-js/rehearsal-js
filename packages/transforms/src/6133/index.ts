import ts from 'typescript';

import { FixTransform, type FixedFile, getCodemodData } from '@rehearsal/plugins';
import { isSourceCodeChanged, transformDiagnosedNode, findNodeAtPosition } from '@rehearsal/utils';

export class FixTransform6133 extends FixTransform {
  fix = (diagnostic: ts.DiagnosticWithLocation): FixedFile[] => {
    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
    const textRemoved = errorNode && errorNode.getFullText();

    const text = transformDiagnosedNode(diagnostic, (node: ts.Node) => {
      if (ts.isImportDeclaration(node) || ts.isImportSpecifier(node)) {
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
