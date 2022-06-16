import FixTransform, { FixedFile } from '../interfaces/fix-transform';
import ts from 'typescript';
import { isVariableOfCatchClause, transformDiagnosedNode } from '../helpers/typescript-ast';
import { isSourceCodeChanged } from '../helpers/strings';

export default class FixTransform2571 extends FixTransform {
  getHint = (replacements: { [key: string]: string }) => {
    if (Object.values(replacements).length < 1) {
      return undefined;
    }

    const { '{0}': actualType } = replacements;
    const hint = `Object is of type '${actualType}'. Specify a type for variable, use type assertion: \`(variable as DesiredType)\` or type guard: \`if (variable instanceof DesiredType) { ... }\``;
    return hint;
  };

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
