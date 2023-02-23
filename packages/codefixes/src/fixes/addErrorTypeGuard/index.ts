import { ChangesFactory, findNodeAtPosition, isVariableOfCatchClause } from '@rehearsal/utils';
import { type CodeFixAction, isIdentifier, isPropertyAccessExpression, Node } from 'typescript';
import { createCodeFixAction } from '../../hints-codefix-collection.js';
import type { CodeFix, DiagnosticWithContext } from '../../types.js';

export class AddErrorTypeGuardCodeFix implements CodeFix {
  getCodeAction(diagnostic: DiagnosticWithContext): CodeFixAction | undefined {
    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
    if (!errorNode || !isIdentifier(errorNode) || !isVariableOfCatchClause(errorNode)) {
      return undefined;
    }

    if (!this.isPropertyOfErrorInterface(errorNode.parent)) {
      return undefined;
    }

    const codeReplacement = `(${errorNode.getText()} as Error)`;

    const changes = ChangesFactory.replaceText(
      diagnostic.file,
      errorNode.getStart(),
      errorNode.getWidth(),
      codeReplacement
    );

    return createCodeFixAction(
      'addErrorTypeGuard',
      [changes],
      'Add type guard for an Error object'
    );
  }

  /**
   * Checks if the `node` is a part of property access expression and is a member of the `Error` interface
   */
  isPropertyOfErrorInterface(node: Node): boolean {
    const errorProps: string[] = ['name', 'message', 'stack'];

    if (isPropertyAccessExpression(node)) {
      return errorProps.includes(node.name.getText());
    }

    return false;
  }
}
