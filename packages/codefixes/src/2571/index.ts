import { ChangesFactory, findNodeAtPosition, isVariableOfCatchClause } from '@rehearsal/utils';
import { CodeFixAction, isIdentifier, isPropertyAccessExpression, Node } from 'typescript';
import { CodeFix, createCodeFixAction, DiagnosticWithContext } from '../types';

export class Fix2571 implements CodeFix {
  getCodeAction(diagnostic: DiagnosticWithContext): CodeFixAction | undefined {
    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
    if (!errorNode || !isIdentifier(errorNode) || !isVariableOfCatchClause(errorNode)) {
      return undefined;
    }

    let codeReplacement = `(${errorNode.getText()} as Error)`;

    if (!this.isPropertyOfErrorInterface(errorNode.parent)) {
      codeReplacement = `(${errorNode.getText()} as any)`;
    }

    const changes = ChangesFactory.replaceText(
      diagnostic.file,
      errorNode.getStart(),
      errorNode.getWidth(),
      codeReplacement
    );

    return createCodeFixAction('addTypeGuard', [changes], 'Add type guard for an Error object');
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
