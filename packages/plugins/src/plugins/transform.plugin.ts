import { extname } from 'node:path';
import {
  GlintService,
  Plugin,
  PluginOptions,
  PluginsRunnerContext,
  type PluginResult,
} from '@rehearsal/service';
import { applyTextChanges } from '@rehearsal/ts-utils';
import ts, { TextChange } from 'typescript';

export class ServiceInjectionsTransformPlugin implements Plugin<PluginOptions> {
  async run(fileName: string, context: PluginsRunnerContext): PluginResult {
    const service = context.service;
    let sourceFile = service.getSourceFile(fileName);

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

    const changes = transformFullyQualifiedServiceInjections(sourceFile);

    if (changes.length) {
      const originalContents = service.getFileText(fileName);

      const updated = applyTextChanges(originalContents, changes);

      service.setFileText(fileName, updated);
    }

    return Promise.resolve([fileName]);
  }
}

function transformFullyQualifiedServiceInjections(sourceFile: ts.SourceFile): ts.TextChange[] {
  const source = sourceFile;
  const printer = ts.createPrinter({});
  const classes = getClasses(sourceFile);
  const changes: TextChange[] = [];
  const importChanges: TextChange[] = [];

  classes.forEach((klass) => {
    getProperties(klass).forEach((prop) => {
      if (!ts.canHaveDecorators(prop)) {
        return;
      }

      const decorators = ts.getDecorators(prop);

      if (decorators === undefined) {
        return;
      }

      decorators.forEach((decorator) => {
        if (getDecoratorName(decorator) !== 'service') {
          return;
        }

        const [arg] = getArgs(decorator);

        if (arg === undefined) {
          return;
        }

        if (!ts.isStringLiteral(arg)) {
          return;
        }

        const argValue = arg.text;

        if (isFullyQualifiedService(argValue)) {
          const [addon, serviceName] = parseFullyQualifiedService(argValue);

          const modifiers = ts.canHaveModifiers(prop) ? ts.getModifiers(prop) ?? [] : [];

          prop = ts.factory.updatePropertyDeclaration(
            prop,
            [...modifiers, ...decorators, ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)],
            prop.name,
            undefined,
            ts.factory.createTypeReferenceNode(classify(serviceName)),
            prop.initializer
          );

          const change = createTextChangeForNode(source, printer, prop);

          changes.push(change);

          const importStatement = `import type ${classify(
            serviceName
          )} from '${addon}/services/${serviceName}';`;

          importChanges.push({
            newText: importStatement,
            span: ts.createTextSpan(0, 0),
          });
        }
      });
    });
  });

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

function createTextChangeForNode(
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

function getClasses(sourceFile: ts.SourceFile): Array<ts.ClassDeclaration> {
  if (sourceFile === undefined) {
    throw new Error('wat');
  }
  return sourceFile.statements.filter((statement) => {
    return ts.isClassDeclaration(statement);
  }) as Array<ts.ClassDeclaration>;
}

function getProperties(klass: ts.ClassDeclaration): ts.PropertyDeclaration[] {
  return klass.members.filter((m) => ts.isPropertyDeclaration(m)) as ts.PropertyDeclaration[];
}

function getDecoratorName(decorator: ts.Decorator): string {
  if (ts.isCallExpression(decorator.expression)) {
    if (ts.isIdentifier(decorator.expression.expression)) {
      return decorator.expression.expression.escapedText.toString();
    }
  }

  return '';
}

function getArgs(decorator: ts.Decorator): Array<ts.Expression> {
  if (ts.isCallExpression(decorator.expression)) {
    return [...decorator.expression.arguments];
  }

  return [];
}

function classify(str: string): string {
  const parts = str.split('-');
  return parts
    .map((part) => {
      return `${part[0].toUpperCase()}${part.substring(1)}`;
    })
    .join('');
}

function isFullyQualifiedService(service: string): boolean {
  return service.includes('@');
}

function parseFullyQualifiedService(service: string): string[] {
  return service.split('@');
}
