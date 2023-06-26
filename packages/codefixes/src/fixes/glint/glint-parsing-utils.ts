import { parseSync } from '@swc/core';

import type {
  ClassExpression,
  ExportDefaultDeclaration,
  Module,
  ModuleItem,
  TsInterfaceDeclaration,
  TsPropertySignature,
} from '@swc/core';

export function parse(content: string): Module {
  return parseSync(content, {
    syntax: 'typescript',
    decorators: true,
  });
}

export function isClassExpression(someDefaultExportDeclaration: ExportDefaultDeclaration): boolean {
  return someDefaultExportDeclaration.decl.type === 'ClassExpression';
}

export function findExportDefaultDeclaration(items: ModuleItem[]): ModuleItem | undefined {
  // Typical use case will have ExportDefaultDeclaration where the body is a ClassExpression
  return items.find((m: ModuleItem) => m.type == 'ExportDefaultDeclaration');
}

export function findSignatureNameInClassExpression(
  someClassExpression: ClassExpression
): string | undefined {
  if (
    !someClassExpression.superTypeParams ||
    someClassExpression.superTypeParams.type !== 'TsTypeParameterInstantiation'
  ) {
    return;
  }

  // Check to see if the superType is a component.
  // Check to seei if ti has a component export

  const superTypeParams = someClassExpression.superTypeParams;

  if (
    superTypeParams.params.length > 0 &&
    superTypeParams.params[0].type === 'TsTypeReference' &&
    superTypeParams.params[0].typeName.type == 'Identifier'
  ) {
    return superTypeParams.params[0].typeName.value;
  }

  return;
}

export function findSingatureNameFromDefaultComponentExport(
  items: ModuleItem[] | undefined
): string | undefined {
  if (!items) {
    return;
  }
  const someExportDefaultDeclaration = findExportDefaultDeclaration(
    items
  ) as ExportDefaultDeclaration;

  if (!someExportDefaultDeclaration) {
    return;
  }

  if (someExportDefaultDeclaration.decl.type !== 'ClassExpression') {
    return;
  }

  const someClassExpression = someExportDefaultDeclaration.decl;

  return findSignatureNameInClassExpression(someClassExpression);
}

export function findTsInterfaceDeclarationByName(
  items: ModuleItem[],
  name: string
): TsInterfaceDeclaration | undefined {
  // Find all interfaces
  const found = items
    .map((m: ModuleItem) => {
      if (m.type === 'TsInterfaceDeclaration') {
        return m;
      }
      // Typical use case will have ExportDeclaration with a declaration of TsInterfaceDeclaration
      if (m.type === 'ExportDeclaration' && m.declaration.type === 'TsInterfaceDeclaration') {
        return m.declaration;
      }
      return undefined;
    })
    .map((m) => m as TsInterfaceDeclaration)
    .find((i) => i?.id?.value === name);

  return found;
}

export function findPropertySignatureByName(
  i: TsInterfaceDeclaration,
  name: string
): TsPropertySignature | undefined {
  return i?.body.body.find(
    (s) => s.type == 'TsPropertySignature' && s.key.type == 'Identifier' && s.key.value === name
  ) as TsPropertySignature;
}

export function findComponentSignatureBodyRange(
  content: string
): { start: number; end: number } | undefined {
  // @Hack SWC bug - https://github.com/swc-project/swc/issues/1366
  const offset = parseSync('').span.end;
  // Need to calculate the current offset as swc's position accumulate after multiple passes.

  const parsed = parse(content);

  const maybeInterfaceName = findSingatureNameFromDefaultComponentExport(parsed.body);
  if (!maybeInterfaceName) {
    return;
  }
  const maybeInterface = findTsInterfaceDeclarationByName(parsed.body, maybeInterfaceName);

  if (!maybeInterface) {
    return;
  }

  const argsSignature = findPropertySignatureByName(maybeInterface, 'Args');

  if (!argsSignature) {
    return;
  }

  const body =
    argsSignature.typeAnnotation?.type == 'TsTypeAnnotation'
      ? argsSignature.typeAnnotation
      : undefined;

  if (!body) {
    return;
  }

  const { start, end } = body.typeAnnotation.span;

  return { start: start - offset, end: end - offset };
}
