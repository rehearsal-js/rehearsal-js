import { dirname } from 'path';
import type { Program, SourceFile, TypeChecker } from 'typescript';
import {
  createProgram,
  findConfigFile,
  parseJsonConfigFileContent,
  readConfigFile,
  sys,
} from 'typescript';

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
    const configFile = findConfigFile(this.basePath, sys.fileExists, 'tsconfig.json');
    if (!configFile) {
      throw Error('configFile not found');
    }
    const { config } = readConfigFile(configFile, sys.readFile);
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
  getSourceFile = (fileName: string): SourceFile | undefined =>
    this.program.getSourceFile(fileName);
  getBasePath = (): string => this.basePath;
}
const testService = TestService.getInstance(__dirname);
export { testService };
