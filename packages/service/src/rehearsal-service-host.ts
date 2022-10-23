import { getDefaultLibFilePath, LanguageServiceHost, ScriptSnapshot, sys } from 'typescript';
import type { CompilerOptions, IScriptSnapshot, MapLike } from 'typescript';

/**
 * ServiceHost represents the layer between the LanguageServer and the permanent storage.
 *
 * The host provides access to versioned snapshot of source file - the state of file
 * in the current moment of time.
 *
 * The host keeps snapshots in memory and saves them to filesystem calling saveFile().
 */
export class RehearsalServiceHost implements LanguageServiceHost {
  private readonly compilerOptions: CompilerOptions;
  private readonly currentDirectory: string;
  private readonly fileNames: string[];
  private readonly files: MapLike<{ snapshot: IScriptSnapshot; version: number }> = {};

  constructor(compilerOptions: CompilerOptions, fileNames: string[]) {
    this.compilerOptions = compilerOptions;
    this.currentDirectory = process.cwd();
    this.fileNames = fileNames;
  }

  /**
   * Updates a snapshot state in memory and increases its version.
   */
  setScriptSnapshot(fileName: string, snapshot: IScriptSnapshot): IScriptSnapshot {
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
  getScriptSnapshot(fileName: string): IScriptSnapshot | undefined {
    if (!(fileName in this.files) && this.fileExists(fileName)) {
      const text = this.readFile(fileName);
      if (text !== undefined) {
        this.setScriptSnapshot(fileName, ScriptSnapshot.fromString(text));
      }
    }

    return this.files[fileName].snapshot;
  }

  getCompilationSettings = (): CompilerOptions => this.compilerOptions;
  getCurrentDirectory = (): string => this.currentDirectory;
  getDefaultLibFileName = (o: CompilerOptions): string => getDefaultLibFilePath(o);
  getScriptFileNames = (): string[] => this.fileNames;
  getScriptVersion = (fileName: string): string => this.files[fileName]?.version.toString() || '0';

  fileExists = sys.fileExists;
  readFile = sys.readFile;
  writeFile = sys.writeFile;

  directoryExists = sys.directoryExists;
  getDirectories = sys.getDirectories;
  readDirectory = sys.readDirectory;
  realpath = sys.realpath;
}
