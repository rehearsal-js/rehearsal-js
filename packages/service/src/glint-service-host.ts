import { DocumentCache, GlintConfig, TransformManager } from '@glint/core';
import ts from 'typescript';

export class GlintServiceHost implements ts.LanguageServiceHost {
  documents: DocumentCache;
  openFileNames: Set<string>;
  rootFileNames: Set<string>;
  transformManager: TransformManager;
  glintConfig: GlintConfig;
  parsedConfig: ts.ParsedCommandLine;
  ts: typeof import('typescript');

  constructor(
    documents: DocumentCache,
    transformManager: TransformManager,
    glintConfig: GlintConfig
  ) {
    this.documents = documents;
    this.transformManager = transformManager;
    this.glintConfig = glintConfig;
    this.ts = glintConfig.ts;
    this.parsedConfig = this.parseTsConfig(glintConfig, transformManager);
    this.openFileNames = new Set();
    this.rootFileNames = new Set(this.parsedConfig.fileNames);
  }

  getScriptFileNames(): string[] {
    return [...new Set(this.allKnownFileNames())];
  }

  getScriptVersion(fileName: string): string {
    return this.documents.getDocumentVersion(fileName);
  }

  getScriptSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
    const contents = this.documents.getDocumentContents(fileName);
    if (typeof contents === 'string') {
      return this.ts.ScriptSnapshot.fromString(contents);
    }
  }

  setScriptSnapshot(fileName: string, text: string): void {
    this.documents.updateDocument(fileName, text);
  }

  fileExists(fileName: string): boolean {
    return this.transformManager.fileExists(fileName);
  }

  readFile(fileName: string): string | undefined {
    return this.transformManager.readTransformedFile(fileName);
  }

  writeFile(fileName: string, text: string): void {
    return this.ts.sys.writeFile(fileName, text);
  }

  readDirectory(
    rootDir: string,
    extensions: string[],
    excludes: string[] | undefined,
    includes: string[],
    depth?: number | undefined
  ): string[] {
    return this.transformManager.readDirectory(rootDir, extensions, excludes, includes, depth);
  }

  getCompilationSettings(): ts.CompilerOptions {
    return this.parsedConfig.options;
  }

  // Yes, this looks like a mismatch, but built-in lib declarations don't resolve
  // correctly otherwise, and this is what the TS wiki uses in their code snippet.
  getDefaultLibFileName(options: ts.CompilerOptions): string {
    return this.ts.getDefaultLibFilePath(options);
  }
  // TS defaults from here down
  getCurrentDirectory(): string {
    return this.ts.sys.getCurrentDirectory();
  }

  private *allKnownFileNames(): Iterable<string> {
    const { environment } = this.glintConfig;

    for (const name of this.rootFileNames) {
      if (environment.isScript(name)) {
        yield name;
      }
    }

    for (const name of this.openFileNames) {
      if (environment.isScript(name)) {
        yield name;
      }
    }
  }

  private parseTsConfig(
    glintConfig: GlintConfig,
    transformManager: TransformManager
  ): ts.ParsedCommandLine {
    const { ts } = glintConfig;
    const contents = ts.readConfigFile(glintConfig.configPath, ts.sys.readFile).config;
    const host = { ...ts.sys, readDirectory: transformManager.readDirectory };

    return ts.parseJsonConfigFileContent(
      contents,
      host,
      glintConfig.rootDir,
      undefined,
      glintConfig.configPath
    );
  }
}
