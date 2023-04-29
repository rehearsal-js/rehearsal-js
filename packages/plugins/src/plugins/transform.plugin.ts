import { extname } from 'node:path';
import { GlintService, Plugin, PluginOptions } from '@rehearsal/service';
import { applyTextChanges } from '@rehearsal/ts-utils';
import ts, { TextChange } from 'typescript';
import debug from 'debug';

const DEBUG_CALLBACK = debug('rehearsal:plugins:transform');

export interface ServiceInjectionsTransformPluginOptions extends PluginOptions {
  servicesMap?: Map<string, string>;
  decoratorName?: string;
}

export class ServiceInjectionsTransformPlugin extends Plugin<ServiceInjectionsTransformPluginOptions> {
  async run(): Promise<string[]> {
    const { fileName, context } = this;
    const service = context.service;
    let sourceFile = service.getSourceFile(fileName);

    // debug callback the version of ts
    DEBUG_CALLBACK('TS API VERSION: %O', ts.version);

    if (!sourceFile) {
      return [];
    }

    if (extname(fileName) === '.gts') {
      sourceFile = ts.createSourceFile(
        fileName,
        // If the file is a gts file, then we know we're dealing with the glint service here
        (service as GlintService).getGlintService().getTransformedContents(fileName)?.contents ||
          '',
        ts.ScriptTarget.ESNext
      );
    }

    const changes = this.transformFullyQualifiedServiceInjections(sourceFile);

    if (changes.length) {
      const originalContents = service.getFileText(fileName);

      const updated = applyTextChanges(originalContents, changes);

      service.setFileText(fileName, updated);
    }

    return Promise.resolve([fileName]);
  }

  transformFullyQualifiedServiceInjections(sourceFile: ts.SourceFile): ts.TextChange[] {
    const source = sourceFile;
    const printer = ts.createPrinter({});
    const classes = this.getClasses(sourceFile);
    const changes: TextChange[] = [];
    const importChanges: TextChange[] = [];

    for (const klass of classes) {
      const properties = this.getProperties(klass);

      for (const prop of properties) {
        if (!ts.canHaveDecorators(prop)) {
          continue;
        }

        const decorators = ts.getDecorators(prop);

        if (decorators === undefined) {
          continue;
        }

        const serviceDecoratorName = this.options.decoratorName ?? 'service';

        for (const decorator of decorators) {
          if (this.getDecoratorName(decorator) !== serviceDecoratorName) {
            continue;
          }

          const qualifiedService = this.getQualifiedServiceName(decorator, prop);
          if (!qualifiedService) {
            continue;
          }

          let serviceClass: string | undefined;
          let serviceModule: string | undefined;

          if (this.isFullyQualifiedService(qualifiedService)) {
            // Strategy: Ember fully qualified service names: `addon@service`
            const [addon, serviceName] = this.parseFullyQualifiedService(qualifiedService);
            serviceClass = this.toClassName(serviceName);
            serviceModule = `${addon}/services/${this.toKebabCase(serviceName)}`;
          } else {
            // Strategy: Use services map
            serviceModule = this.findServiceInMap(qualifiedService);
            if (serviceModule) {
              serviceClass = this.toClassName(qualifiedService);
            }
          }

          if (!serviceClass || !serviceModule) {
            continue;
          }

          const modifiers = ts.canHaveModifiers(prop) ? ts.getModifiers(prop) ?? [] : [];

          const updatedProp = ts.factory.updatePropertyDeclaration(
            prop,
            [...modifiers, ...decorators, ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)],
            prop.name,
            undefined,
            ts.factory.createTypeReferenceNode(serviceClass),
            prop.initializer
          );

          const change = this.createTextChangeForNode(source, printer, updatedProp);

          changes.push(change);

          const importStatement = `import type ${serviceClass} from '${serviceModule}';`;

          importChanges.push({
            newText: importStatement,
            span: ts.createTextSpan(0, 0),
          });
        }
      }
    }

    // We have to manually add newlines for `.gts` files because our formatting step doesn't work
    // on gts
    if (importChanges.length && extname(sourceFile.fileName) === '.gts') {
      importChanges.forEach((change) => {
        change.newText = change.newText + '\n';
      });
    }

    changes.push(...importChanges);

    return changes;
  }

  createTextChangeForNode(
    source: ts.SourceFile,
    printer: ts.Printer,
    node: ts.Node
  ): ts.TextChange {
    const start = node.getStart(source);
    const end = node.getEnd();

    const propContents = printer.printNode(ts.EmitHint.Unspecified, node, source);

    const span = ts.createTextSpan(node.getStart(source), end - start);

    const change: TextChange = {
      newText: propContents,
      span,
    };

    return change;
  }

  getClasses(sourceFile: ts.SourceFile): Array<ts.ClassDeclaration> {
    if (sourceFile === undefined) {
      throw new Error('wat');
    }
    return sourceFile.statements.filter((statement) => {
      return ts.isClassDeclaration(statement);
    }) as Array<ts.ClassDeclaration>;
  }

  getProperties(klass: ts.ClassDeclaration): ts.PropertyDeclaration[] {
    return klass.members.filter((m) => ts.isPropertyDeclaration(m)) as ts.PropertyDeclaration[];
  }

  getDecoratorName(decorator: ts.Decorator): string {
    const expression = ts.isCallExpression(decorator.expression)
      ? decorator.expression.expression
      : decorator.expression;

    return ts.isIdentifier(expression) ? expression.escapedText.toString() : '';
  }

  getQualifiedServiceName(decorator: ts.Decorator, prop: ts.Node): string | undefined {
    if (ts.isCallExpression(decorator.expression)) {
      // Covers `@service('service-name')` and `@service('addon@service-name')`
      if (decorator.expression.arguments.length) {
        const arg = decorator.expression.arguments[0];
        return ts.isStringLiteral(arg) ? arg.text : undefined;
      }
    } else {
      // Covers `@service serviceName`
      if (ts.isPropertyDeclaration(prop) && ts.isIdentifier(prop.name)) {
        return this.toKebabCase(prop.name.escapedText.toString());
      }
    }

    // Covers @service() propName
    return undefined;
  }

  /**
   * @see https://en.wikipedia.org/wiki/Fully_qualified_domain_name
   */
  isFullyQualifiedService(service: string): boolean {
    return service.includes('@');
  }

  parseFullyQualifiedService(service: string): string[] {
    return service.split('@');
  }

  /**
   * Converts string to kebab-case
   */
  toKebabCase(str: string): string {
    return str.replace(/[\W_]+|(?<=[a-z0-9])(?=[A-Z])/g, '-').toLowerCase();
  }

  /**
   * Converts string to camelCase
   */
  toCamelCase(str: string): string {
    return str.replace(/-./g, (x) => x[1].toUpperCase());
  }

  /**
   * Converts string to ClassName (camelCase + upper case the first letter)
   */
  toClassName(str: string): string {
    str = this.toCamelCase(str);
    return str.replace(/^./, str[0].toUpperCase());
  }

  /**
   * Search for service in the services map using camelCase and kebab-case as a key
   */
  findServiceInMap(serviceName: string): string | undefined {
    if (this.options.servicesMap === undefined) {
      return undefined;
    }

    const serviceNameKebab = this.toKebabCase(serviceName);
    if (this.options.servicesMap.has(serviceNameKebab)) {
      return this.options.servicesMap.get(serviceNameKebab);
    }

    const serviceNameCamel = this.toCamelCase(serviceName);
    if (this.options.servicesMap.has(serviceNameCamel)) {
      return this.options.servicesMap.get(serviceNameCamel);
    }

    return undefined;
  }
}
