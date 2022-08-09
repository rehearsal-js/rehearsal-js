import ts from 'typescript';

import { FixTransform, type FixResult } from '../interfaces/fix-transform';

import { isVariableOfCatchClause, transformDiagnosedNode } from '../helpers/typescript-ast';
import { isSourceCodeChanged } from '../helpers/strings';
import { getInitialResult, addCodemodDataToResult } from '../helpers/transform-utils';

export class FixTransform2571 extends FixTransform {
  hint = `Object is of type '{0}'. Specify a type of variable, use type assertion: \`(variable as DesiredType)\` or type guard: \`if (variable instanceof DesiredType) { ... }\``;

  fix = (diagnostic: ts.DiagnosticWithLocation): FixResult => {
    let result = getInitialResult(diagnostic);
    const text = transformDiagnosedNode(diagnostic, (node: ts.Node) => {
      const fileName = diagnostic.file.fileName;

      if (ts.isIdentifier(node) && isVariableOfCatchClause(node)) {
        if (isPropertyOfErrorInterface(node.parent)) {
          return ts.factory.createAsExpression(node, ts.factory.createTypeReferenceNode('Error'));
        } else {
          return ts.factory.createAsExpression(node, ts.factory.createTypeReferenceNode('any'));
        }
      } else {
        this.hint = `Object is of type '{0}'. Specify a type of ${node.getText()}, use type assertion: \`(${node.getText()} as DesiredType)\` or type guard: \`if (${node.getText()} instanceof DesiredType) { ... }\``;
        result = addCodemodDataToResult(result, fileName, this.hint);
      }

      return node;
    });

    const hasChanged = isSourceCodeChanged(diagnostic.file.getFullText(), text);
    if (hasChanged) {
      result.files[diagnostic.file.fileName].updatedText = text;
      return result;
    }
    return result;
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
