import ts from 'typescript';

export function parse(fileName: string, content: string): ts.SourceFile {
  return ts.createSourceFile(
    fileName,
    content,
    ts.ScriptTarget.ESNext,
    true // setParentNodes true in order to access jsDoc comments on nodes; off by default
  );
}

export function getNearestComponentClassDeclaration(
  targetNode: ts.Node
): ts.ClassDeclaration | undefined {
  let parent = targetNode.parent;

  do {
    if (!parent) {
      return;
    }

    if (ts.isClassDeclaration(parent) && hasGlimmerComponentHeritageClause(parent)) {
      return parent;
    }
  } while ((parent = parent.parent));

  return;
}

function getInterfaceByIdentifier(
  sourceFile: ts.SourceFile,
  targetIdentifier: ts.Identifier
): ts.InterfaceDeclaration | undefined {
  const found = sourceFile.statements.find((s) => {
    return ts.isInterfaceDeclaration(s) && s.name.escapedText == targetIdentifier.escapedText;
  });

  if (!found) {
    return;
  }

  return found as ts.InterfaceDeclaration;
}

export function getClassNameFromClassDeclaration(
  classDeclaration: ts.ClassDeclaration
): string | undefined {
  if (classDeclaration.name) {
    return classDeclaration.name.escapedText.toString();
  }
  return;
}

function hasGlimmerComponentHeritageClause(classDeclaration: ts.ClassDeclaration): boolean {
  return !!getComponentHeritageClause(classDeclaration.heritageClauses);
}

function getComponentHeritageClause(
  heritageClasses: ts.NodeArray<ts.HeritageClause> | undefined
): ts.HeritageClause | undefined {
  if (!heritageClasses) {
    return;
  }

  for (const h of heritageClasses) {
    const foundClass = h.types.find(
      (t) => ts.isIdentifier(t.expression) && t.expression.escapedText == 'Component'
      // TODO add check to see if it's using the @glimmer/component export.
    );

    if (foundClass) {
      return h;
    }
  }

  return undefined;
}

function getComponentSignatureIdentifierFromSuperClassComponent(
  heritageClauses: ts.NodeArray<ts.HeritageClause> | undefined
): ts.Identifier | undefined {
  if (!heritageClauses) {
    return;
  }

  for (const h of heritageClauses) {
    const foundExpressionWithTypeArguments = h.types.find(
      (t) => ts.isIdentifier(t.expression) && t.expression.escapedText == 'Component'
    );

    if (
      foundExpressionWithTypeArguments &&
      foundExpressionWithTypeArguments?.typeArguments &&
      foundExpressionWithTypeArguments.typeArguments.length == 1 &&
      ts.isTypeReferenceNode(foundExpressionWithTypeArguments.typeArguments[0]) &&
      ts.isIdentifier(foundExpressionWithTypeArguments.typeArguments[0].typeName)
    ) {
      return foundExpressionWithTypeArguments.typeArguments[0].typeName;
    }
  }

  return undefined;
}

/**
 * Finds the identifier node for the component super class
 * @param sourceFile parsed ts source file
 * @returns ts.Identifier
 */
export function getIdentifierForComponent(
  classDeclaration: ts.ClassDeclaration
): ts.Identifier | undefined {
  if (!hasHeritageClauses(classDeclaration)) {
    return;
  }

  const heritageClasses = classDeclaration.heritageClauses ?? [];

  for (const h of heritageClasses) {
    const foundType = h.types.find(
      (t) => ts.isIdentifier(t.expression) && t.expression.escapedText == 'Component'
    );
    if (foundType && ts.isIdentifier(foundType.expression)) {
      return foundType.expression;
    }
  }

  return undefined;
}

export function getComponentSignatureName(
  classDeclaration: ts.ClassDeclaration
): string | undefined {
  if (!hasHeritageClauses(classDeclaration)) {
    return;
  }

  const someIdentifier = getComponentSignatureIdentifierFromSuperClassComponent(
    classDeclaration.heritageClauses
  );

  return someIdentifier?.escapedText.toString();
}

/**
 * Check the default export component class for an interface on the Component
 * @param sourceFile
 * @returns
 */
export function hasComponentSignature(classDeclaration: ts.ClassDeclaration): boolean {
  return !!getComponentSignatureName(classDeclaration);
}

function hasHeritageClauses(classDeclaration: ts.ClassDeclaration): boolean {
  return (
    ts.isClassDeclaration(classDeclaration) &&
    !!classDeclaration.heritageClauses &&
    classDeclaration.heritageClauses.length > 0
  );
}

export function getComponentSignatureInterfaceNode(
  sourceFile: ts.SourceFile,
  classDeclaration: ts.ClassDeclaration
): ts.InterfaceDeclaration | undefined {
  if (!hasHeritageClauses(classDeclaration)) {
    return;
  }

  const someInterfaceIdentifier = getComponentSignatureIdentifierFromSuperClassComponent(
    classDeclaration.heritageClauses
  );

  if (!someInterfaceIdentifier) {
    return;
  }

  const someInterface = getInterfaceByIdentifier(sourceFile, someInterfaceIdentifier);

  return someInterface;
}

type ComponentSignatureInterfaceProperty = 'Args' | 'Element' | 'Blocks';

export function hasPropertyOnComponentSignatureInterface(
  i: ts.InterfaceDeclaration,
  targetProperty: ComponentSignatureInterfaceProperty
): boolean {
  return !!getPropertyOnComponentSignatureInterface(i, targetProperty);
}

export function getPropertyOnComponentSignatureInterface(
  i: ts.InterfaceDeclaration,
  targetProperty: ComponentSignatureInterfaceProperty
): ts.PropertySignature | undefined {
  if (!i.members || i.members.length < 1) {
    return;
  }

  const found = i.members.find(
    (node) =>
      node.name && ts.isIdentifier(node.name) && node.name.escapedText.toString() === targetProperty
  );

  if (!found || !ts.isPropertySignature(found)) {
    return;
  }

  return found;
}

export function getJSDocExtendsTagWithSignature(
  classDeclaration: ts.ClassDeclaration
): string | undefined {
  // Augments Tag will work to retrieve the `@extends` tag.
  const jsDocs = ts.getAllJSDocTagsOfKind(classDeclaration, ts.SyntaxKind.JSDocAugmentsTag);

  if (jsDocs.length < 1) {
    return;
  }

  const jsDocAugmentsTag = jsDocs[0] as ts.JSDocAugmentsTag;

  if (!jsDocAugmentsTag.class.typeArguments) {
    return;
  }

  const maybeTypeRef = jsDocAugmentsTag.class.typeArguments.find((n) => ts.isTypeReferenceNode(n));

  if (!maybeTypeRef) {
    return;
  }

  let ref: ts.TypeReferenceNode | undefined;

  if (maybeTypeRef.kind === ts.SyntaxKind.TypeReference) {
    ref = maybeTypeRef as ts.TypeReferenceNode;
    // Assert that the parent expression is for `Component`
    if (ref.typeName.kind == ts.SyntaxKind.Identifier) {
      return ref.typeName.escapedText.toString();
    }
  }

  return;
}

type LikeTemplateOnlyComponentVariableDeclaration = ts.VariableDeclaration & {
  type: ts.TypeReferenceNode & { typeName: ts.Identifier };
};

export function isTemplateOnlyComponent(
  targetNode: ts.Node,
  identifierName = 'TemplateOnlyComponent'
): targetNode is LikeTemplateOnlyComponentVariableDeclaration {
  if (
    ts.isVariableDeclaration(targetNode) &&
    targetNode.type &&
    ts.isTypeReferenceNode(targetNode.type) &&
    ts.isIdentifier(targetNode.type.typeName) &&
    targetNode.type.typeName.escapedText === identifierName
  ) {
    return true;
  }

  return false;
}

export function getNearestTemplateOnlyComponentVariableDeclaration(
  targetNode: ts.Node,
  identifierName = 'TemplateOnlyComponent'
): ts.Node | undefined {
  let target = targetNode;
  do {
    if (!target.parent) {
      return;
    }

    if (isTemplateOnlyComponent(target, identifierName)) {
      return target;
    }
  } while ((target = target.parent));

  return;
}

export function getComponentSignatureNameFromTemplateOnlyComponent(
  target: ts.Node
): ts.Identifier | undefined {
  if (isTemplateOnlyComponent(target)) {
    const typeArguments = target.type.typeArguments ?? [];
    const maybeSignature = typeArguments[0];

    if (!maybeSignature || !ts.isTypeReferenceNode(maybeSignature)) {
      return;
    }

    if (ts.isTypeReferenceNode(maybeSignature) && ts.isIdentifier(maybeSignature.typeName)) {
      return maybeSignature.typeName;
    }
    return;
  }
  return;
}
