import type {
  CallExpression,
  ClassDeclaration,
  ClassExpression,
  ClassMember,
  ClassProperty,
  Decorator,
  ExportDefaultDeclaration,
  Identifier,
  ImportDeclaration,
  ImportSpecifier,
  ModuleItem,
  NamedImportSpecifier,
  StringLiteral,
} from '@swc/core';
import { parseFileSync } from '@swc/core';
import debug from 'debug';
import { join } from 'path';

type EmberInferredServiceDependency = {
  addonName?: string;
  serviceName: string;
};

const DEBUG_CALLBACK = debug('rehearsal:discoverEmberServiceDependencies');

const EMPTY_RESULT: EmberInferredServiceDependency[] = [];

export function discoverServiceDependencies(
  baseDir: string,
  pathToFile: string
): EmberInferredServiceDependency[] {
  const filePath = join(baseDir, pathToFile);

  const parsed = parseFileSync(filePath, { syntax: 'ecmascript', decorators: true });

  // Get all imports of '@ember/service'.

  const maybeImportDeclarations = filterImportDeclarationsBySource(parsed.body, '@ember/service');

  if (!maybeImportDeclarations) {
    DEBUG_CALLBACK('No import declaration found');
    return EMPTY_RESULT;
  }

  // We need to look through all import declarations to find the one with the export `inject`
  const importDeclaration = findImportDeclarationWithExportedName(
    maybeImportDeclarations,
    'inject'
  );

  if (!importDeclaration) {
    DEBUG_CALLBACK('No import declaration found with usage of inject');
    return EMPTY_RESULT;
  }

  // In the case of re-assignment from inject as service, we walk the specifiers
  const maybeSpecifier = findSpecifierByExportedName(importDeclaration.specifiers, 'inject');

  if (!maybeSpecifier) {
    return EMPTY_RESULT;
  }

  const decoratorName = maybeSpecifier.local.value;

  if (!decoratorName) {
    return EMPTY_RESULT;
  }

  let foundClasses: Array<ClassExpression | ClassDeclaration> = [];

  // Find all ClassDeclaration in body of the parsed file
  const classDeclrations = findClassDeclarations(parsed.body);

  if (classDeclrations) {
    foundClasses = foundClasses.concat(Array.from(classDeclrations));
  }

  // Typical use case will have ExportDefaultDeclaration where the body is a ClassExpression
  const someDefaultExport = parsed.body.find(
    (m: ModuleItem) => m.type == 'ExportDefaultDeclaration'
  );

  if (someDefaultExport) {
    const edd = someDefaultExport as ExportDefaultDeclaration;
    // Check if the ExportDefaultDeclaration has a ClassExpression
    if (edd.decl.type === 'ClassExpression') {
      foundClasses.push(edd.decl as ClassExpression);
    } else {
      DEBUG_CALLBACK('Default export does not contain a ClassExpression');
    }
  }

  if (foundClasses.length < 1) {
    return EMPTY_RESULT;
  }

  let results: EmberInferredServiceDependency[] = EMPTY_RESULT;

  for (const classExp of foundClasses) {
    const body = classExp.body;

    const classProperties = filterByClassPropertyWithDecorators(body);

    if (!classProperties) {
      continue;
    }

    const classPropertiesWithDecorators = filterClassPropertyWithDecoratorName(
      classProperties,
      decoratorName
    );

    if (!classPropertiesWithDecorators) {
      continue;
    }

    results = classPropertiesWithDecorators.map((prop: ClassProperty) => {
      if (prop.decorators) {
        const maybeDecorator = findDecoratorWithName(prop.decorators, decoratorName);

        if (!!maybeDecorator && isDecoratorWithExpressionTypeCallExpression(maybeDecorator)) {
          const callExpression = maybeDecorator.expression as CallExpression;
          const arg = callExpression.arguments[0].expression as StringLiteral;
          // someAddon@serviceName

          return parseServiceMetaFromString(arg.value);
        }
      }

      // Fallback if decorator.expression where decoratorName`  is not call expression
      return { serviceName: (prop.key as Identifier).value };
    });
  }

  return results;
}

function findClassDeclarations(items: ModuleItem[]): Array<ClassDeclaration> | undefined {
  return items
    .filter((i: ModuleItem) => i.type == 'ClassDeclaration')
    .map((i) => i as ClassDeclaration);
}

function parseServiceMetaFromString(str: string): EmberInferredServiceDependency {
  if (str.includes('@')) {
    const [addonName, serviceName] = str.split('@');
    return { addonName, serviceName };
  }
  return { serviceName: str };
}

function filterByClassPropertyWithDecorators(members: ClassMember[]): ClassProperty[] {
  const result: unknown = members.filter(
    (m: ClassMember) => m.type == 'ClassProperty' && !!m.decorators
  );
  return result as ClassProperty[];
}

function filterClassPropertyWithDecoratorName(
  classProperties: ClassProperty[],
  decoratorName: string
): ClassProperty[] {
  return classProperties.filter((prop: ClassProperty) => {
    const decorators = prop.decorators;
    return !!decorators && hasDecoratorWithName(decorators, decoratorName);
  });
}

function findDecoratorWithName(
  decorators: Decorator[],
  decoratorName: string
): Decorator | undefined {
  return decorators.find((d) => {
    let identifier: Identifier | undefined;

    // For a given decorate it's expression proeprty can either
    // be an Identifier or CallExpression

    // If it's an identifier it would look like
    // e.g. `@service name;`
    if (isDecoratorWithExpressionTypeIdenfitier(d)) {
      identifier = d.expression as Identifier;
    }

    // If it's a CallExpression this is the case where we pass meta data
    // into the decorator
    // e.g. `@service('someAddon@serviceName') myVariable;`
    else if (isDecoratorWithExpressionTypeCallExpression(d)) {
      const callExpression = d.expression as CallExpression;
      identifier = callExpression.callee as Identifier;
    }

    return !!identifier && identifier.value === decoratorName;
  });
}

function hasDecoratorWithName(decorators: Decorator[], decoratorName: string): boolean {
  return !!findDecoratorWithName(decorators, decoratorName);
}

function isDecoratorWithExpressionTypeIdenfitier(d: Decorator): boolean {
  return d.expression.type === 'Identifier';
}

function isDecoratorWithExpressionTypeCallExpression(d: Decorator): boolean {
  return d.expression.type === 'CallExpression';
}

function filterImportDeclarationsBySource(
  items: ModuleItem[],
  source: string
): ImportDeclaration[] {
  return items.filter((i) => isImportDeclaration(i, source)).map((i) => i as ImportDeclaration);
}

function findImportDeclarationWithExportedName(
  items: ImportDeclaration[],
  exportName: string
): ImportDeclaration | undefined {
  return items.find((i: ImportDeclaration) => {
    const found = findSpecifierByExportedName(i.specifiers, exportName);

    return found ?? false;
  });
}

function isImportDeclaration(m: ModuleItem, source: string): boolean {
  return m.type === 'ImportDeclaration' && m.source.value === source;
}

function findSpecifierByExportedName(
  specifiers: ImportSpecifier[],
  exportName: string
): ImportSpecifier | undefined {
  return specifiers.find((s: NamedImportSpecifier | ImportSpecifier) => {
    // If imported is null, then only have a local value, which implies no re-assignment.
    // e.g.
    // import { foo as bar } from 'baz'; -> bar is local, foo is imported
    // import { foo } from 'baz'; -> foo is local, imported is null
    return (
      (s as NamedImportSpecifier)?.imported?.value === exportName || s.local.value === exportName
    );
  });
}
