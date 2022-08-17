import ts from 'typescript';

import { FixTransform, type FixedFile, getCodemodResult } from '@rehearsal/plugins';
import {
  isSourceCodeChanged,
  isVariableOfCatchClause,
  transformDiagnosedNode,
} from '@rehearsal/utils';

export class FixTransform2571 extends FixTransform {
  fix = (diagnostic: ts.DiagnosticWithLocation): FixedFile[] => {
    const text = transformDiagnosedNode(diagnostic, (node: ts.Node) => {
      if (ts.isIdentifier(node) && isVariableOfCatchClause(node)) {
        if (isPropertyOfErrorInterface(node.parent)) {
          return ts.factory.createAsExpression(node, ts.factory.createTypeReferenceNode('Error'));
        } else {
          return ts.factory.createAsExpression(node, ts.factory.createTypeReferenceNode('any'));
        }
      }

      return node;
    });

    const hasChanged = isSourceCodeChanged(diagnostic.file.getFullText(), text);
    if (hasChanged) {
      return getCodemodResult(diagnostic.file, text, diagnostic.start);
    }

    return [];
  };
}

/**
 * Checks if the `node` is a part of property access expression and is a member of the `Error` interface
 */
function isPropertyOfErrorInterface(node: ts.Node): boolean {
  const errorProps: string[] = ['name', 'message', 'stack'];

  if (ts.isPropertyAccessExpression(node)) {
    return errorProps.includes(node.name.getText());
  }

  return false;
}
