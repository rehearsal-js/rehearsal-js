import ts from 'typescript';
import { dirname } from 'path';

class TestService {
  private static instance: TestService;
  static getInstance(basePath: string): TestService {
    if (!TestService.instance) {
      TestService.instance = new TestService(basePath);
    }
    return TestService.instance;
  }

  private readonly basePath: string;
  private readonly program: ts.Program;

  private constructor(basePath: string) {
    this.basePath = basePath;
    this.program = this.createProgram();
  }

  private createProgram = () => {
    const configFile = ts.findConfigFile(this.basePath, ts.sys.fileExists, 'tsconfig.json');
    if (!configFile) {
      throw Error('configFile not found');
    }
    const { config } = ts.readConfigFile(configFile, ts.sys.readFile);
    const { options: compilerOptions, fileNames } = ts.parseJsonConfigFileContent(
      config,
      ts.sys,
      dirname(configFile),
      {},
      configFile
    );

    const program = ts.createProgram(fileNames, compilerOptions);
    return program;
  };

  getTypeChecker = () => this.program.getTypeChecker();
  getSourceFile = (fileName: string) => this.program.getSourceFile(fileName);
  getBasePath = () => this.basePath;
}
const testService = TestService.getInstance(__dirname);
export default testService;
