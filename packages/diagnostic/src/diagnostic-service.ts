import fs from 'fs';
import ts from 'typescript';

export class DiagnosticService {
  readonly files: ts.MapLike<{ version: string }>;
  readonly service: ts.LanguageService;

  constructor(fileNames: string[], compilerOptions: ts.CompilerOptions = {}) {
    this.files = Object.fromEntries(fileNames.map((fileName) => [fileName, { version: '0' }]));
    this.service = this.createLanguageService(fileNames, compilerOptions);
  }

  /**
   * Gets a SourceFile object from the compiled program
   */
  getSourceFile(fileName: string): ts.SourceFile {
    return this.service.getProgram()!.getSourceFile(fileName)!;
  }

  /**
   * Gets a list of semantic diagnostic objects only with location information (those have related node in the AST)
   */
  getSemanticDiagnosticsWithLocation(fileName: string): ts.DiagnosticWithLocation[] {
    return this.service.getSemanticDiagnostics(fileName).filter(this.isDiagnosticWithLocation);
  }

  /**
   * Returns the string representation of AST tree of the SourceFile
   */
  printSourceFile(sourceFile: ts.SourceFile): string {
    return ts
      .createPrinter({
        newLine: ts.NewLineKind.LineFeed,
        removeComments: false,
      })
      .printFile(sourceFile);
  }

  isDiagnosticWithLocation(diagnostic: ts.Diagnostic): diagnostic is ts.DiagnosticWithLocation {
    return diagnostic.start !== undefined && diagnostic.length !== undefined;
  }

  private createLanguageService(
    fileNames: string[],
    compilerOptions: ts.CompilerOptions
  ): ts.LanguageService {
    return ts.createLanguageService({
      getCompilationSettings: () => compilerOptions,
      getCurrentDirectory: () => process.cwd(),
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      getScriptFileNames: () => fileNames,
      getScriptVersion: (fileName) => this.files[fileName] && this.files[fileName].version,
      getScriptSnapshot: (fileName) =>
        ts.sys.readFile(fileName)
          ? ts.ScriptSnapshot.fromString(fs.readFileSync(fileName).toString())
          : undefined,
      directoryExists: ts.sys.directoryExists,
      fileExists: ts.sys.fileExists,
      getDirectories: ts.sys.getDirectories,
      readDirectory: ts.sys.readDirectory,
      readFile: ts.sys.readFile,
    });
  }
}
