import ts from 'typescript';

import { FixTransform, type FixedFile, getCodemodResult } from '@rehearsal/plugins';
import { isSourceCodeChanged, transformDiagnosedNode } from '@rehearsal/utils';

export class FixTransform6133 extends FixTransform {
  fix = (diagnostic: ts.DiagnosticWithLocation): FixedFile[] => {
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

    return getCodemodResult(diagnostic.file, text, diagnostic.start);
  };
}
