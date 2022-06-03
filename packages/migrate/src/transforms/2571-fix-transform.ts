import FixTransform, { FixedFile } from '../interfaces/fix-transform';
import ts from 'typescript';
import { isVariableOfCatchClause, transformDiagnosedNode } from '../helpers/typescript-ast';
import { isSourceCodeChanged } from '../helpers/strings';

export default class FixTransform2571 extends FixTransform {
  hint = `Object is of type '{0}'. Specify a type of variable, use type assertion: \`(variable as DesiredType)\` or type guard: \`if (variable instanceof DesiredType) { ... }\``;

  fix = (diagnostic: ts.DiagnosticWithLocation): FixedFile[] => {
    const text = transformDiagnosedNode(diagnostic, (node: ts.Node) => {
      if (ts.isIdentifier(node) && isVariableOfCatchClause(node)) {
        if (isPropertyOfErrorInterface(node.parent)) {
          return ts.factory.createAsExpression(node, ts.factory.createTypeReferenceNode('Error'));
        } else {
          return ts.factory.createAsExpression(node, ts.factory.createTypeReferenceNode('any'));
        }
      } else {
        this.hint = `Object is of type '{0}'. Specify a type of ${node.getText()}, use type assertion: \`(${node.getText()} as DesiredType)\` or type guard: \`if (${node.getText()} instanceof DesiredType) { ... }\``;
      }

      return node;
    });

    const hasChanged = isSourceCodeChanged(diagnostic.file.getFullText(), text);

    return hasChanged ? [{ fileName: diagnostic.file.fileName, text }] : [];
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
