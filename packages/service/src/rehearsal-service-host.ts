import { dirname } from 'node:path';
import ts, {
  ApplyCodeActionCommandResult,
  InstallPackageOptions,
  LanguageServiceHost,
} from 'typescript';
import { addDep } from '@rehearsal/utils';
import findupSync from 'findup-sync';
import type { CompilerOptions, IScriptSnapshot, MapLike } from 'typescript';

const { ScriptSnapshot, getDefaultLibFilePath, sys } = ts;

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
  private seenTypingsRequest = new Map<string, string>();
  private typeRootVersion = 0;

  constructor(compilerOptions: CompilerOptions, fileNames: string[]) {
    this.compilerOptions = compilerOptions;
    this.currentDirectory = process.cwd();
    this.fileNames = fileNames;
  }

  getTypeRootsVersion(): number {
    return this.typeRootVersion;
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

  async installPackage(options: InstallPackageOptions): Promise<ApplyCodeActionCommandResult> {
    if (this.seenTypingsRequest.has(options.fileName)) {
      return { successMessage: `Succussfully installed ${options.packageName}` };
    }

    // Save the intall request information so we don't continuously download
    this.seenTypingsRequest.set(options.fileName, options.packageName);

    const nearestPackageJSON = findupSync('package.json', {
      cwd: dirname(options.fileName),
    });

    if (nearestPackageJSON) {
      // Note: the TSServer is going to swallow the success and failures
      // @see https://github.com/microsoft/TypeScript/blob/10941888dca8dc68a64fe1729258cf9ffef861ec/src/server/session.ts#L2804
      await addDep([options.packageName], true, { cwd: dirname(nearestPackageJSON) });

      // We must increment this version here so that when the language server
      // synchronizes it knows that we need re-create the program with the new
      // types we just downloaded
      this.typeRootVersion++;

      return { successMessage: `Succussfully installed ${options.packageName}` };
    }

    return Promise.reject({ error: `Could not install ${options.packageName}` });
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

  isKnownTypesPackageName(): boolean {
    // try all packages that come through here
    return true;
  }

  getCompilationSettings = (): CompilerOptions => this.compilerOptions;
  getCurrentDirectory = (): string => this.currentDirectory;
  getDefaultLibFileName = (o: CompilerOptions): string => getDefaultLibFilePath(o);
  getScriptFileNames = (): string[] => this.fileNames;
  getScriptVersion = (fileName: string): string => this.files[fileName]?.version.toString() || '0';

  // eslint-disable-next-line @typescript-eslint/unbound-method
  fileExists = sys.fileExists;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  readFile = sys.readFile;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  writeFile = sys.writeFile;

  // eslint-disable-next-line @typescript-eslint/unbound-method
  directoryExists = sys.directoryExists;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  getDirectories = sys.getDirectories;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  readDirectory = sys.readDirectory;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  realpath = sys.realpath;
}
