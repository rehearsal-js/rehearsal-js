import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import type { Program, SourceFile, TypeChecker } from 'typescript';

const { createProgram, findConfigFile, parseJsonConfigFileContent, readConfigFile, sys } = ts;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class TestService {
  private static instance: TestService;
  static getInstance(basePath: string): TestService {
    if (!TestService.instance || TestService.instance.getBasePath() !== basePath) {
      TestService.instance = new TestService(basePath);
    }
    return TestService.instance;
  }

  private readonly basePath: string;
  private readonly program: Program;

  private constructor(basePath: string) {
    this.basePath = basePath;
    this.program = this.createProgram();
  }

  private createProgram = (): Program => {
    const configFile = findConfigFile(
      this.basePath,
      (filepath) => sys.fileExists(filepath),
      'tsconfig.json'
    );
    if (!configFile) {
      throw Error('configFile not found');
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { config } = readConfigFile(configFile, (filepath: string, encoding?: string) =>
      sys.readFile(filepath, encoding)
    );
    const { options: compilerOptions, fileNames } = parseJsonConfigFileContent(
      config,
      sys,
      dirname(configFile),
      {},
      configFile
    );

    const program = createProgram(fileNames, compilerOptions);
    return program;
  };

  getTypeChecker = (): TypeChecker => this.program.getTypeChecker();
  getSourceFile = (fileName: string): SourceFile | undefined => {
    const sourceFile = this.program.getSourceFile(fileName);
    return sourceFile;
  };
  getBasePath = (): string => this.basePath;
}
const testService = TestService.getInstance(__dirname);
export { testService };
