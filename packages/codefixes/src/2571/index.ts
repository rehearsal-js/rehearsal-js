import { findNodeAtPosition, isVariableOfCatchClause } from '@rehearsal/utils';
import { DiagnosticWithLocation, isIdentifier, isPropertyAccessExpression, Node } from 'typescript';

import { type FixedFile, FixTransform, getCodemodData } from '../fix-transform';

export class FixTransform2571 extends FixTransform {
  fix = (diagnostic: DiagnosticWithLocation): FixedFile[] => {
    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
    if (errorNode && isIdentifier(errorNode) && isVariableOfCatchClause(errorNode)) {
      let codeReplacement;

      if (isPropertyOfErrorInterface(errorNode.parent)) {
        codeReplacement = `(${errorNode.getFullText()} as Error)`;
      } else {
        codeReplacement = `(${errorNode.getFullText()} as any)`;
      }
      const originalText = diagnostic.file.getFullText();
      const updatedText = `${originalText.substring(
        0,
        diagnostic.start
      )}${codeReplacement}${originalText.substring(
        diagnostic.start + errorNode.getFullText().length
      )}`;
      return getCodemodData(
        diagnostic.file,
        updatedText,
        diagnostic.start,
        codeReplacement,
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
