import ts from 'typescript';
import fs from 'fs';

export default class DiagnosticService {
  readonly host: ts.LanguageServiceHost;
  readonly service: ts.LanguageService;

  readonly fileNames: string[];
  readonly fileMeta: ts.MapLike<{ version: number }>;

  constructor(basePath: string, configFile: string, compilerOptions: ts.CompilerOptions = {}) {
    this.fileMeta = {};
    this.fileNames = [];

    const { config } = ts.readConfigFile(configFile, ts.sys.readFile);
    const { options, fileNames } = ts.parseJsonConfigFileContent(
      config,
      ts.sys,
      basePath,
      compilerOptions
    );

    this.fileNames = fileNames;

    this.initMeta(this.fileNames);
    this.host = this.createHost(this.fileNames, options);
    this.service = ts.createLanguageService(this.host, ts.createDocumentRegistry());

    // throw Error(`Can't create a TypeScript Language Service`);
  }

  getRootSourceFiles(): ts.SourceFile[] {
    return (
      this.service
        .getProgram()
        ?.getSourceFiles()
        ?.filter(({ fileName }) => this.fileNames.includes(fileName)) || []
    );
  }

  getSemanticDiagnostics(sourceFile: ts.SourceFile): ts.Diagnostic[] {
    return this.service.getSemanticDiagnostics(sourceFile.fileName);
  }

  updateSourceFile(sourceFile: ts.SourceFile): ts.SourceFile {
    fs.writeFileSync(sourceFile.fileName, sourceFile.text, 'utf8');
    this.fileMeta[sourceFile.fileName].version++;
    this.service.getEmitOutput(sourceFile.fileName);

    return this.service.getProgram()!.getSourceFile(sourceFile.fileName)!;
  }

  initMeta(fileNames: string[]): void {
    for (const fileName of fileNames) {
      this.fileMeta[fileName] = { version: 0 };
    }
  }

  createHost(fileNames: string[], compilerOptions: ts.CompilerOptions): ts.LanguageServiceHost {
    return {
      getScriptFileNames: () => fileNames,
      getScriptVersion: (fileName) =>
        this.fileMeta[fileName] && this.fileMeta[fileName].version.toString(),
      getScriptSnapshot: (fileName) => {
        if (!fs.existsSync(fileName)) {
          return undefined;
        }

        return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName).toString());
      },
      getCurrentDirectory: () => process.cwd(),
      getCompilationSettings: () => compilerOptions,
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      fileExists: ts.sys.fileExists,
      readFile: ts.sys.readFile,
      readDirectory: ts.sys.readDirectory,
      directoryExists: ts.sys.directoryExists,
      getDirectories: ts.sys.getDirectories,
    };
  }
}
