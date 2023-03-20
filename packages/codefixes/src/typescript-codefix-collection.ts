import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Module from 'node:module';
import ts, {
  type CodeActionCommand,
  type CodeFixAction,
  FileTextChanges,
  type FormatCodeSettings,
  Node,
  SourceFile,
  TextChange,
  TypeChecker,
  TypeNode,
  type UserPreferences,
} from 'typescript';
import { isCodeFixSupported } from './safe-codefixes.js';
import type { CodeFixCollection, CodeFixCollectionFilter, DiagnosticWithContext } from './types.js';
import type { Options as PrettierOptions } from 'prettier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = Module.createRequire(import.meta.url);

const { SemicolonPreference, getDefaultFormatCodeSettings } = ts;

/**
 * Provides code fixes based on the Typescript's codefix collection.
 * @see https://github.com/microsoft/TypeScript/tree/main/src/services/codefixes
 */
export class TypescriptCodeFixCollection implements CodeFixCollection {
  hasPrettier: boolean | undefined;
  prettierConfigs: PrettierOptions | undefined;

  getFixesForDiagnostic(
    diagnostic: DiagnosticWithContext,
    filter: CodeFixCollectionFilter
  ): CodeFixAction[] {
    const languageService = diagnostic.service;

    const userPreferences: UserPreferences = {
      disableSuggestions: false,
      quotePreference: 'auto',
      includeCompletionsForModuleExports: true,
      includeCompletionsForImportStatements: true,
      includeAutomaticOptionalChainCompletions: true,
      importModuleSpecifierEnding: 'minimal',
      includePackageJsonAutoImports: 'auto',
      jsxAttributeCompletionStyle: 'auto',
    };

    const fixes = languageService.getCodeFixesAtPosition(
      diagnostic.file.fileName,
      diagnostic.start,
      diagnostic.start + diagnostic.length,
      [diagnostic.code],
      this.getFormatCodeSettingsForFile(diagnostic.file.fileName),
      userPreferences
    );

    const filteredCodeFixes: CodeFixAction[] = [];

    for (let fix of fixes) {
      if (filter.safeFixes && !isCodeFixSupported(fix.fixName)) {
        continue;
      }

      if (filter.strictTyping) {
        let strictCodeFix = this.makeCodeFixStrict(fix, diagnostic);

        if (strictCodeFix === undefined && isInstallPackageCommand(fix)) {
          strictCodeFix = fix;
        }

        if (!strictCodeFix) {
          continue;
        }

        fix = strictCodeFix;
      }

      filteredCodeFixes.push(fix);
    }

    return filteredCodeFixes;
  }

  canBeResolved(checker: TypeChecker, typeNode: TypeNode): boolean {
    if (ts.isTypeReferenceNode(typeNode)) {
      const type = checker.getTypeFromTypeNode(typeNode);

      // We need to check type arguments in case of using Generic type
      const typeArguments =
        (type as unknown as { resolvedTypeArguments?: ts.Type[] }).resolvedTypeArguments || [];

      const isTypeError = (type: ts.Type): boolean => {
        // I have no idea how to get this value or how to check if type is real the right way, so use this hack
        return (type as unknown as { intrinsicName?: string }).intrinsicName === 'error';
      };

      return !isTypeError(type) && !typeArguments.find(isTypeError);
    }

    if (ts.isParenthesizedTypeNode(typeNode)) {
      return this.canBeResolved(checker, typeNode.type);
    }

    if (ts.isUnionTypeNode(typeNode)) {
      return !typeNode.types.find((type) => !this.canBeResolved(checker, type));
    }

    if (ts.isFunctionTypeNode(typeNode)) {
      // Types of function types params (params without types are skipped)
      const types = typeNode.parameters
        .map((parameter) => parameter.type)
        .filter((parameter): parameter is TypeNode => parameter !== undefined);

      // Checking a function return type + all available parameter types
      return ![typeNode.type, ...types].find((type) => !this.canBeResolved(checker, type));
    }

    // Bypass other king of types
    return true;
  }

  /**
   * Remove text changes contains loose typing (like usage of `any` type)
   */
  private makeCodeFixStrict(
    fix: CodeFixAction,
    diagnostic: DiagnosticWithContext
  ): CodeFixAction | undefined {
    // Filtering out not-strict and broken types
    const safeChanges: FileTextChanges[] = [];
    for (const changes of fix.changes) {
      const safeTextChanges: TextChange[] = [];
      for (const textChanges of changes.textChanges) {
        // Don't return dummy function declarations
        if (textChanges.newText.includes('throw new Error')) {
          continue;
        }

        // Covers: `: any`, `| any`, `<any`, `any>`, `any |`, and same cases with `any[]`
        const anyTypeUsageRegex = /[:<|]\s*any|any(\[])*\s*[|>]/i;
        if (anyTypeUsageRegex.test(textChanges.newText)) {
          continue;
        }

        // Covers: `: object`, `| object`, `<object`, `object>`, `object |`, and same cases with `object[]`
        const objectTypeUsageRegex = /[:<|]\s*object|object(\[])*\s*[|>]/i;
        if (objectTypeUsageRegex.test(textChanges.newText)) {
          continue;
        }

        // Covers cases with broken type signatures, like: `() =>`
        const brokenTypeSignatures = /\(\) =>\s*$/i;
        if (brokenTypeSignatures.test(textChanges.newText)) {
          continue;
        }

        // Covers broken and unresolved types
        if (
          fix.fixName === 'annotateWithTypeFromJSDoc' &&
          diagnostic.file.fileName.includes('ts-types.ts') &&
          diagnostic.node!.getText() === 'think'
        ) {
          const node = this.findNodeEndsAtPosition(diagnostic.file, textChanges.span.start);

          if (node && ts.isParameter(node.parent)) {
            const typeTag = ts
              .getJSDocParameterTags(node.parent)
              .find((tag) => tag.typeExpression?.type);

            if (typeTag && !this.canBeResolved(diagnostic.checker, typeTag.typeExpression!.type)) {
              continue;
            }
          }
        }

        safeTextChanges.push(textChanges);
      }

      if (safeTextChanges.length) {
        safeChanges.push({ ...changes, textChanges: safeTextChanges });
      }
    }

    if (safeChanges.length) {
      return { ...fix, changes: safeChanges };
    }

    return undefined;
  }

  findNodeEndsAtPosition(sourceFile: SourceFile, pos: number): Node | undefined {
    let previousNode: ts.Node = sourceFile;

    const visitor = (node: Node): Node | undefined => {
      if (node.getStart() >= pos) {
        return previousNode;
      }

      previousNode = node;

      return ts.forEachChild(node, visitor);
    };

    return visitor(sourceFile);
  }

  private getFormatCodeSettingsForFile(filePath: string): FormatCodeSettings {
    if (this.hasPrettier === undefined) {
      let prettierConfig: PrettierOptions | null = null;

      try {
        prettierConfig = importPrettier(filePath).resolveConfig.sync(filePath, {
          editorconfig: true,
        });
      } catch (e) {
        // swallow the error. Prettier is not installed
      }

      if (prettierConfig) {
        this.hasPrettier = true;
        this.prettierConfigs = prettierConfig;
      }
    }

    const tsFormatCodeOptions = getDefaultFormatCodeSettings();

    let useSemicolons = true;
    let indentSize = tsFormatCodeOptions.tabSize ?? 2;
    let convertTabsToSpaces = true;

    if (this.prettierConfigs) {
      useSemicolons = this.prettierConfigs.semi !== false;
      indentSize = this.prettierConfigs.tabWidth ?? indentSize;
      convertTabsToSpaces = this.prettierConfigs.useTabs !== true;
    }

    return {
      ...tsFormatCodeOptions,
      baseIndentSize: indentSize,
      convertTabsToSpaces,
      indentSize,
      semicolons: useSemicolons ? SemicolonPreference.Insert : SemicolonPreference.Remove,
    };
  }
}

function importPrettier(fromPath: string): typeof import('prettier') {
  const pkg = getPackageInfo('prettier', fromPath);
  const main = resolve(pkg.path);
  return require(main) as typeof import('prettier');
}

function getPackageInfo(packageName: string, fromPath: string): { path: string } {
  const paths = [__dirname];

  paths.unshift(fromPath);

  const packageJSONPath = require.resolve(`${packageName}/package.json`, {
    paths,
  });

  return {
    path: dirname(packageJSONPath),
  };
}

export function isInstallPackageCommand(
  fix: CodeFixAction
): fix is CodeFixAction & { commands: CodeActionCommand } {
  return fix.fixId === 'installTypesPackage' && !!fix.commands;
}
