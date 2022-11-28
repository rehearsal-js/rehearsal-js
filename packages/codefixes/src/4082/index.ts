import {
  findNodeAtPosition,
  getTypeDeclarationFromTypeSymbol,
  insertIntoText,
  isSubtypeOf,
  isTypeMatched,
} from '@rehearsal/utils';
import {
  flattenDiagnosticMessageText,
  isExportAssignment,
  isObjectLiteralExpression,
} from 'typescript';

import { type FixedFile, FixTransform } from '../types';
import { getCodemodData } from '../utils';
import type {
  DiagnosticWithLocation,
  ExportAssignment,
  Node,
  ObjectLiteralExpression,
  PropertyAssignment,
  Type,
  TypeChecker,
  TypeReference,
} from 'typescript';
import type { RehearsalService } from '@rehearsal/service';

const EXPORT_KEYWORD_WITH_SPACE = 'export ';

export class FixTransform4082 extends FixTransform {
  fix = (diagnostic: DiagnosticWithLocation, service: RehearsalService): FixedFile[] => {
    const program = service.getLanguageService().getProgram()!;
    const checker = program.getTypeChecker();

    const errorNode = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
    if (!errorNode || !isExportAssignment(errorNode)) {
      return [];
    }

    /**
     * For example, targetTypeString is 'Props'
     * typeType is the type object that corresponds to targetTypeString
     * parentType is the type object that has the type string of: '({ name: string, age: number} : Props): JXS.Element'
     **/
    const message = flattenDiagnosticMessageText(diagnostic.messageText, '. ');
    const targetTypeString = getTargetTypeName(message);
    if (!targetTypeString) {
      return [];
    }

    const parentType = findParentTypeInExportAssignment(errorNode, targetTypeString, checker);
    if (!parentType) {
      return [];
    }

    const targetType = findTargetTypeInParentType(targetTypeString, parentType, checker);

    const targetTypeDeclaration = targetType && getTypeDeclarationFromTypeSymbol(targetType);
    if (!targetTypeDeclaration) {
      return [];
    }

    const sourceFile = targetTypeDeclaration.getSourceFile();
    const updatedText = insertIntoText(
      sourceFile.getFullText(),
      targetTypeDeclaration.getStart(),
      EXPORT_KEYWORD_WITH_SPACE
    );

    return getCodemodData(
      sourceFile,
      updatedText,
      targetTypeDeclaration.getStart(),
      EXPORT_KEYWORD_WITH_SPACE,
      'add'
    );
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
  exportAssignment: ExportAssignment,
  targetTypeString: string,
  checker: TypeChecker
): Type | undefined {
  const expression = exportAssignment.expression;
  let parentType: Type | undefined;

  if (isObjectLiteralExpression(expression)) {
    parentType = findTypeInObjectLiteralExpression(expression, targetTypeString, checker);
  } else {
    parentType = checker.getTypeAtLocation(expression);
  }
  return parentType;
}

function findTypeInObjectLiteralExpression(
  expression: ObjectLiteralExpression,
  targetTypeStr: string,
  checker: TypeChecker
): Type | undefined {
  for (const prop of expression.properties) {
    const type = checker.getTypeAtLocation((prop as PropertyAssignment).initializer);
    if (isSubtypeOf(targetTypeStr, type, checker)) {
      return type;
    }
  }
  return undefined;
}

function findNodeByText(node: Node, text: string): Node | undefined {
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
  parentType: Type,
  checker: TypeChecker
): Type | undefined {
  let targetType: Type | undefined;

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
  type: Type,
  subTypeString: string,
  checker: TypeChecker
): Type | undefined {
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
    const typeArguments = checker.getTypeArguments(type as TypeReference);
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
