import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Module from 'node:module';
import ts, { type FormatCodeSettings, type SourceFile } from 'typescript';
import { Options as PrettierOptions } from 'prettier';
import type { Location } from '@rehearsal/reporter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = Module.createRequire(import.meta.url);

const { SemicolonPreference, getDefaultFormatCodeSettings } = ts;

const INDEX_BUMP = 1; //bump line and column numbers from 0 to 1 for sarif reader

export function getLocation(sourceFile: SourceFile, start: number, length: number): Location {
  const { line: startLine, character: startColumn } =
    sourceFile.getLineAndCharacterOfPosition(start);
  const { line: endLine, character: endColumn } = sourceFile.getLineAndCharacterOfPosition(
    start + length
  );

  return {
    startLine: startLine + INDEX_BUMP,
    startColumn: startColumn + INDEX_BUMP,
    endLine: endLine + INDEX_BUMP,
    endColumn: endColumn + INDEX_BUMP,
  };
}

export function setProcessTTYto(setting: boolean): void {
  if (typeof process !== 'undefined') {
    process.stdout.isTTY = setting;
  }
}

export async function getFormatCodeSettingsForFile(filePath: string): Promise<FormatCodeSettings> {
  let prettierConfig: PrettierOptions | null = null;

  try {
    const prettier = importPrettier(filePath);
    prettierConfig = await prettier.resolveConfig(filePath, {
      editorconfig: true,
    });
  } catch (e) {
    // swallow the error. Prettier is not installed
  }

  const tsFormatCodeOptions = getDefaultFormatCodeSettings();

  let useSemicolons = true;
  let indentSize = tsFormatCodeOptions.tabSize ?? 2;
  let convertTabsToSpaces = true;

  if (prettierConfig) {
    useSemicolons = prettierConfig.semi !== false;
    indentSize = prettierConfig.tabWidth ?? indentSize;
    convertTabsToSpaces = prettierConfig.useTabs !== true;
  }

  return {
    ...tsFormatCodeOptions,
    baseIndentSize: indentSize,
    convertTabsToSpaces,
    indentSize,
    semicolons: useSemicolons ? SemicolonPreference.Insert : SemicolonPreference.Remove,
  };
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
