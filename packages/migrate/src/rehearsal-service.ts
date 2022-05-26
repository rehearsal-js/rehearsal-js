import ts from 'typescript';

/**
 * ServiceHost represents the layer between the LanguageServer and the permanent storage.
 *
 * The host provides access to versioned snapshot of source file - the state of file
 * in the current moment of time.
 *
 * The host keeps snapshots in memory and saves them to filesystem calling saveFile().
 */
export class RehearsalServiceHost implements ts.LanguageServiceHost {
  private readonly compilerOptions: ts.CompilerOptions;
  private readonly currentDirectory: string;
  private readonly fileNames: string[];
  private readonly files: ts.MapLike<{ snapshot: ts.IScriptSnapshot; version: number }> = {};

  constructor(compilerOptions: ts.CompilerOptions, fileNames: string[]) {
    this.compilerOptions = compilerOptions;
    this.currentDirectory = process.cwd();
    this.fileNames = fileNames;
  }

  /**
   * Updates a snapshot state in memory and increases its version.
   */
  setScriptSnapshot(fileName: string, snapshot: ts.IScriptSnapshot): ts.IScriptSnapshot {
    this.files[fileName] = {
      snapshot: snapshot,
      version: this.files[fileName]?.version + 1 || 0,
    };

    return this.files[fileName].snapshot;
  }

  /**
   * Gets the latest snapshot
   * If a snapshot doesn't exist yet - reads its content from file as the first version
   */
  getScriptSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
    if (!(fileName in this.files) && this.fileExists(fileName)) {
      const text = this.readFile(fileName);
      if (text !== undefined) {
        this.setScriptSnapshot(fileName, ts.ScriptSnapshot.fromString(text));
      }
    }

    return this.files[fileName].snapshot;
  }

  getCompilationSettings = (): ts.CompilerOptions => this.compilerOptions;
  getCurrentDirectory = (): string => this.currentDirectory;
  getDefaultLibFileName = (o: ts.CompilerOptions): string => ts.getDefaultLibFilePath(o);
  getScriptFileNames = (): string[] => this.fileNames;
  getScriptVersion = (fileName: string): string => this.files[fileName]?.version.toString() || '0';

  fileExists = ts.sys.fileExists;
  readFile = ts.sys.readFile;
  writeFile = ts.sys.writeFile;
}

/**
 * Service represents the list of helper functions wrapped over compiled program context.
 * Service helps to get diagnostics and work with source files content (through ServiceHost).
 */
export default class RehearsalService {
  protected readonly host: RehearsalServiceHost;
  protected readonly service: ts.LanguageService;

  constructor(compilerOptions: ts.CompilerOptions = {}, fileNames: string[]) {
    this.host = new RehearsalServiceHost(compilerOptions, fileNames);
    this.service = ts.createLanguageService(this.host);
  }

  /**
   * Gets the content of the file from its latest in-memory state
   */
  getFileText(fileName: string): string {
    const snapshot = this.host.getScriptSnapshot(fileName);
    return snapshot?.getText(0, snapshot?.getLength()) || '';
  }

  /**
   * Updates the current state of the file with the new content
   */
  setFileText(fileName: string, text: string): void {
    this.host.setScriptSnapshot(fileName, ts.ScriptSnapshot.fromString(text));
  }

  /**
   * Saves the latest state (snapshot) of the file to filesystem
   */
  saveFile(fileName: string): void {
    const snapshot = this.host.getScriptSnapshot(fileName);
    this.host.writeFile(fileName, snapshot?.getText(0, snapshot?.getLength()) || '');
  }

  /**
   * Gets a SourceFile object from the compiled program
   */
  getSourceFile(fileName: string): ts.SourceFile {
    return this.service.getProgram()!.getSourceFile(fileName)!;
  }

  /**
   * Gets the LanguageService
   */
  getLanguageService(): ts.LanguageService {
    return this.service;
  }

  /**
   * Gets a list of semantic diagnostic objects only with location information (those have related node in the AST)
   */
  getSemanticDiagnosticsWithLocation(fileName: string): ts.DiagnosticWithLocation[] {
    // Type-guard for DiagnosticWithLocation
    const withLocation = (diagnostic: ts.Diagnostic): diagnostic is ts.DiagnosticWithLocation =>
      diagnostic.start !== undefined && diagnostic.length !== undefined;

    return this.service.getSemanticDiagnostics(fileName).filter(withLocation);
  }

  /**
   * Provides a path to a module file by its name
   */
  resolveModuleName(moduleName: string, containingFile: string): string | undefined {
    const result = ts.resolveModuleName(
      moduleName,
      containingFile,
      this.host.getCompilationSettings(),
      ts.sys
    );
    return result?.resolvedModule?.resolvedFileName;
  }
}
