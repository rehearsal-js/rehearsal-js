import { findNodeAtPosition, isVariableOfCatchClause } from '@rehearsal/utils';
import { DiagnosticWithLocation, isIdentifier, isPropertyAccessExpression, Node } from 'typescript';

import { type FixedFile, FixTransform } from '../types';
import { getCodemodData } from '../utils';

export class FixTransform2571 extends FixTransform {
  fix = (diagnostic: DiagnosticWithLocation): FixedFile[] => {
    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
    if (errorNode && isIdentifier(errorNode) && isVariableOfCatchClause(errorNode)) {
      let codeReplacement;

      if (isPropertyOfErrorInterface(errorNode.parent)) {
        codeReplacement = `(${errorNode.getText()} as Error)`;
      } else {
        codeReplacement = `(${errorNode.getText()} as any)`;
      }

      const originalText = diagnostic.file.text;
      const updatedText =
        originalText.substring(0, errorNode.getStart()) +
        codeReplacement +
        originalText.substring(errorNode.getEnd());

      return getCodemodData(
        diagnostic.file,
        updatedText,
        diagnostic.start,
        codeReplacement,
        errorNode.getFullText().trim(),
        'replace'
      );
    } else {
      return [];
    }
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
