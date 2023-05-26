import { parseSync } from '@swc/core';
import debug from 'debug';

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
import type { CustomImportResolver } from './types.js';

const DEBUG_CALLBACK = debug('rehearsal:migration-graph:discover-ember-service-dependencies');

export function discoverServiceDependencies(
  serviceMap: Record<string, string>
): CustomImportResolver {
  return (contentType: 'ecmascript' | 'typescript', content: string): string[] => {
    if (!(content.includes('@ember/service') || content.includes('@glimmerx/service'))) {
      return [];
    }

    const parsed = parseSync(content, {
      syntax: contentType,
      decorators: true,
      decoratorsBeforeExport: true,
    });

    if (!parsed) {
      return [];
    }

    // Get all imports of '@ember/service'.

    const maybeImportDeclarations = filterImportDeclarationsBySource(parsed.body, '@ember/service');

    if (!maybeImportDeclarations) {
      DEBUG_CALLBACK('No import declaration found');
      return [];
    }

    // We need to look through all import declarations to find for exports with either:
    // `inject` 3.28
    // `service` 4+

    const foundImportDeclarationUsingInject = findImportDeclarationWithExportedName(
      maybeImportDeclarations,
      'inject'
    );

    const foundImportDeclarationUsingService = findImportDeclarationWithExportedName(
      maybeImportDeclarations,
      'service'
    );

    const importDeclaration =
      foundImportDeclarationUsingInject || foundImportDeclarationUsingService;

    if (!importDeclaration) {
      DEBUG_CALLBACK('No import declaration found with exported names: inject or service');
      return [];
    }

    // In the case of re-assignment from inject as service, we walk the specifiers
    const maybeInjectSpecifier = findSpecifierByExportedName(
      importDeclaration.specifiers,
      'inject'
    );
    const maybeServiceSpecifier = findSpecifierByExportedName(
      importDeclaration.specifiers,
      'service'
    );

    const maybeSpecifier = maybeInjectSpecifier || maybeServiceSpecifier;

    if (!maybeSpecifier) {
      return [];
    }

    const decoratorName = maybeSpecifier.local.value;

    if (!decoratorName) {
      return [];
    }

    let foundClasses: Array<ClassExpression | ClassDeclaration> = [];

    // Find all ClassDeclaration in body of the parsed file
    const classDeclarations = findClassDeclarations(parsed.body);

    if (classDeclarations) {
      foundClasses = foundClasses.concat(Array.from(classDeclarations));
    }

    // Typical use case will have ExportDefaultDeclaration where the body is a ClassExpression
    const someDefaultExport = parsed.body.find(
      (m: ModuleItem) => m.type == 'ExportDefaultDeclaration'
    );

    if (someDefaultExport) {
      const edd = someDefaultExport as ExportDefaultDeclaration;
      // Check if the ExportDefaultDeclaration has a ClassExpression
      if (edd.decl.type === 'ClassExpression') {
        foundClasses.push(edd.decl);
      } else {
        DEBUG_CALLBACK('Default export does not contain a ClassExpression');
      }
    }

    if (foundClasses.length < 1) {
      return [];
    }

    let results: string[] = [];

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

            if (serviceMap[arg.value]) {
              return serviceMap[arg.value];
            }

            return parseServiceMetaFromString(arg.value);
          }
        }

        const keyName = (prop.key as Identifier).value;

        if (serviceMap[keyName]) {
          return serviceMap[keyName];
        }

        // Fallback if decorator.expression where decoratorName`  is not call expression
        return intoFileName(keyName);
      });
    }

    return results;
  };
}

function findClassDeclarations(items: ModuleItem[]): Array<ClassDeclaration> | undefined {
  return items
    .filter((i: ModuleItem) => i.type == 'ClassDeclaration')
    .map((i) => i as ClassDeclaration);
}

function parseServiceMetaFromString(str: string): string {
  if (str.includes('@')) {
    const idx = str.lastIndexOf('@');
    const packageNameOrModuleName = str.substring(0, idx);
    const serviceName = str.substring(idx + 1);
    return `${packageNameOrModuleName}/services/${intoFileName(serviceName)}`;
  }
  return intoFileName(str);
}

const STRING_DECAMELIZE_REGEXP = /([a-z\d])([A-Z])/g;
const STRING_DASHERIZE_REGEXP = /[ _]/g;
function intoFileName(str: string): string {
  return str
    .replace(STRING_DECAMELIZE_REGEXP, '$1_$2')
    .toLowerCase()
    .replace(STRING_DASHERIZE_REGEXP, '-');
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

    // For a given decorate its expression property can either
    // be an Identifier or CallExpression

    // If it's an identifier it would look like
    // e.g. `@service name;`
    if (isDecoratorWithExpressionTypeIdentifier(d)) {
      identifier = d.expression as Identifier;
    }

    // If it's a CallExpression this is the case where we pass metadata
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

function isDecoratorWithExpressionTypeIdentifier(d: Decorator): boolean {
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
