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

  directoryExists = ts.sys.directoryExists;
  getDirectories = ts.sys.getDirectories;
  readDirectory = ts.sys.readDirectory;
  realpath = ts.sys.realpath;
}
