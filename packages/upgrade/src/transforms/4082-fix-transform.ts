import ts from 'typescript';

import { type RehearsalService } from '@rehearsal/service';
import { isSubtypeOf, getTypeDeclarationFromTypeSymbol, isTypeMatched } from '@rehearsal/utils';
import { DataAggregator, FixResult } from '@rehearsal/reporter';

import { FixTransform } from '../interfaces/fix-transform';
import { findNodeAtPosition, insertIntoText } from '../helpers/typescript-ast';
import { getLocation } from '../helpers/transform-utils';

const EXPORT_KEYWORD = 'export';
export class FixTransform4082 extends FixTransform {
  hint = `Default export of the module has or is using private name {0}`;

  fix = (diagnostic: ts.DiagnosticWithLocation, service: RehearsalService): FixResult => {
    this.dataAggregator = DataAggregator.getInstance(diagnostic);
    // let result = getInitialResult(diagnostic);

    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
    if (!errorNode) {
      return this.dataAggregator.getResult();
    }

    const program = service.getLanguageService().getProgram()!;
    const checker = program.getTypeChecker();

    /**
     * For example, targetTypeString is 'Props'
     * typeType is the type object that corresponds to targetTypeString
     * parentType is the type object that has the type string of: '({ name: string, age: number} : Props): JXS.Element'
     **/
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '. ');
    const targetTypeString = getTargetTypeName(message);
    if (!targetTypeString) {
      return this.dataAggregator.getResult();
    }

    if (ts.isExportAssignment(errorNode)) {
      const parentType = findParentTypeInExportAssignment(errorNode, targetTypeString, checker);

      if (!parentType) {
        return this.dataAggregator.getResult();
      }

      const targetType = findTargetTypeInParentType(targetTypeString, parentType, checker);

      const targetTypeDeclaration = targetType && getTypeDeclarationFromTypeSymbol(targetType);
      if (!targetTypeDeclaration) {
        return this.dataAggregator.getResult();
      }

      const sourceFile = targetTypeDeclaration.getSourceFile();
      const start = targetTypeDeclaration.getStart();
      const updatedText = insertIntoText(
        sourceFile.getFullText(),
        start,
        `${EXPORT_KEYWORD} `
      );

      const location = getLocation(sourceFile, start);

      this.dataAggregator.addCodemodDataToResult(sourceFile.fileName, updatedText, EXPORT_KEYWORD, ['added', 'tracedFile'], location);
    }
    return this.dataAggregator.getResult();
  };
}

function getTargetTypeName(message: string): string | undefined {
  const matches = message.match(/'([^']+)'/);
  if (matches && matches.length > 1) {
    return matches[1];
  }
  return undefined;
}

function findParentTypeInExportAssignment(
  exportAssignment: ts.ExportAssignment,
  targetTypeString: string,
  checker: ts.TypeChecker
): ts.Type | undefined {
  const expression = exportAssignment.expression;
  let parentType: ts.Type | undefined;

  if (ts.isObjectLiteralExpression(expression)) {
    parentType = findTypeInObjectLiteralExpression(expression, targetTypeString, checker);
  } else {
    parentType = checker.getTypeAtLocation(expression);
  }
  return parentType;
}

function findTypeInObjectLiteralExpression(
  expression: ts.ObjectLiteralExpression,
  targetTypeStr: string,
  checker: ts.TypeChecker
): ts.Type | undefined {
  for (const prop of expression.properties) {
    const type = checker.getTypeAtLocation((prop as ts.PropertyAssignment).initializer);
    if (isSubtypeOf(targetTypeStr, type, checker)) {
      return type;
    }
  }
  return undefined;
}

function findNodeByText(node: ts.Node, text: string): ts.Node | undefined {
  const children = Array.from(node.getChildren());
  for (const child of children) {
    const childText = child.getFullText().trim();
    if (childText === text) {
      return child;
    } else if (childText.match(new RegExp('\\b' + text + '\\b'))) {
      return findNodeByText(child, text);
    }
  }
  return undefined;
}

function findTargetTypeInParentType(
  targetTypeString: string,
  parentType: ts.Type,
  checker: ts.TypeChecker
): ts.Type | undefined {
  let targetType: ts.Type | undefined;

  if (parentType.symbol) {
    const parentTypeDeclaration = getTypeDeclarationFromTypeSymbol(parentType);
    const targetTypeNode =
      parentTypeDeclaration && findNodeByText(parentTypeDeclaration, targetTypeString);
    targetType = targetTypeNode && checker.getTypeAtLocation(targetTypeNode);
  } else {
    targetType = findTypeInCompositeType(parentType, targetTypeString, checker);
  }
  return targetType;
}

function findTypeInCompositeType(
  type: ts.Type,
  subTypeString: string,
  checker: ts.TypeChecker
): ts.Type | undefined {
  if (!isSubtypeOf(subTypeString, type, checker)) {
    return undefined;
  }
  if (type.isUnionOrIntersection()) {
    for (const t of type.types) {
      if (isTypeMatched(subTypeString, t)) {
        return t;
      } else if (isSubtypeOf(subTypeString, t, checker)) {
        return findTypeInCompositeType(t, subTypeString, checker);
      }
    }
  } else {
    const typeArguments = checker.getTypeArguments(type as ts.TypeReference);
    if (typeArguments.length > 0) {
      for (const t of typeArguments) {
        if (isTypeMatched(subTypeString, t)) {
          return t;
        } else if (isSubtypeOf(subTypeString, t, checker)) {
          return findTypeInCompositeType(t, subTypeString, checker);
        }
      }
    }

    const aliasTypeArguments = type.aliasTypeArguments;
    if (aliasTypeArguments && aliasTypeArguments.length > 0) {
      for (const t of aliasTypeArguments) {
        if (isTypeMatched(subTypeString, t)) {
          return t;
        } else if (isSubtypeOf(subTypeString, t, checker)) {
          return findTypeInCompositeType(t, subTypeString, checker);
        }
      }
    }
  }
  return undefined;
}
