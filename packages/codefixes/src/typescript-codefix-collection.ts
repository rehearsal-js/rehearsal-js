import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Module from 'node:module';
import ts, {
  type CodeActionCommand,
  type CodeFixAction,
  FileTextChanges,
  type FormatCodeSettings,
  TextChange,
  type UserPreferences,
} from 'typescript';
import { isCodeFixSupported } from './safe-codefixes.js';
import { Diagnostics } from './diagnosticInformationMap.generated.js';
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

    let fixes: readonly CodeFixAction[] = [];

    try {
      fixes = languageService.getCodeFixesAtPosition(
        diagnostic.file.fileName,
        diagnostic.start,
        diagnostic.start + diagnostic.length,
        [diagnostic.code],
        this.getFormatCodeSettingsForFile(diagnostic.file.fileName),
        userPreferences
      );
    } catch (e) {
      const hideError =
        diagnostic.code == Diagnostics.TS2345.code &&
        e instanceof TypeError &&
        e.message.includes(`Cannot read properties of undefined (reading 'flags')`);

      if (!hideError) {
        throw e;
      }
    }

    const filteredCodeFixes: CodeFixAction[] = [];

    for (let fix of fixes) {
      if (filter.safeFixes && !isCodeFixSupported(fix.fixName)) {
        continue;
      }

      if (filter.strictTyping) {
        let strictCodeFix = makeCodeFixStrict(fix);

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

export function makeCodeFixStrict(fix: CodeFixAction): CodeFixAction | undefined {
  // Filtering out all text changes contain `any`
  const safeChanges: FileTextChanges[] = [];
  for (const changes of fix.changes) {
    const safeTextChanges: TextChange[] = [];
    for (const textChanges of changes.textChanges) {
      // Don't return dummy function declarations
      if (textChanges.newText.includes('throw new Error')) {
        continue;
      }

      const neverTypeUsageRegex = /(=>|[:<|])\s*never|never(\[])*\s*[|>]/i;
      if (neverTypeUsageRegex.test(textChanges.newText)) {
        continue;
      }

      // Covers: `: any`, `| any`, `<any`, `any>`, `any |`, `=> any`, and same cases with `any[]`
      const anyTypeUsageRegex = /(=>|[:<|])\s*any|any(\[])*\s*[|>]/i;
      if (anyTypeUsageRegex.test(textChanges.newText)) {
        continue;
      }

      // Covers: `: object`, `| object`, `<object`, `object>`, `object |`, `=> object`, and same cases with `object[]`
      const objectTypeUsageRegex = /(=>|[:<|])\s*object|object(\[])*\s*[|>]/i;
      if (objectTypeUsageRegex.test(textChanges.newText)) {
        continue;
      }

      // Covers cases with broken type signatures, like: `() =>`
      const brokenTypeSignatures = /\(\) =>\s*$/i;
      if (brokenTypeSignatures.test(textChanges.newText)) {
        continue;
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
