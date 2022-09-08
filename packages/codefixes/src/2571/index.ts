import {
  isSourceCodeChanged,
  isVariableOfCatchClause,
  transformDiagnosedNode,
} from '@rehearsal/utils';
import type { DiagnosticWithLocation, Node } from 'typescript';
import { factory, isIdentifier, isPropertyAccessExpression } from 'typescript';

import { type FixedFile, FixTransform, getCodemodData } from '../fix-transform';

export class FixTransform2571 extends FixTransform {
  fix = (diagnostic: DiagnosticWithLocation): FixedFile[] => {
    const text = transformDiagnosedNode(diagnostic, (node: Node) => {
      if (isIdentifier(node) && isVariableOfCatchClause(node)) {
        if (isPropertyOfErrorInterface(node.parent)) {
          return factory.createAsExpression(node, factory.createTypeReferenceNode('Error'));
        } else {
          return factory.createAsExpression(node, factory.createTypeReferenceNode('any'));
        }
      }

      return node;
    });

    const hasChanged = isSourceCodeChanged(diagnostic.file.getFullText(), text);
    if (hasChanged) {
      return getCodemodData(diagnostic.file, text, diagnostic.start);
    }

    return [];
  };
}

/**
 * Checks if the `node` is a part of property access expression and is a member of the `Error` interface
 */
function isPropertyOfErrorInterface(node: Node): boolean {
  const errorProps: string[] = ['name', 'message', 'stack'];

  if (isPropertyAccessExpression(node)) {
    return errorProps.includes(node.name.getText());
  }

  return false;
}
