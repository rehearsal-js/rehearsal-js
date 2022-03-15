import { PluginParams } from 'ts-migrate-server';
import { ts, createProject } from '@ts-morph/bootstrap';

export async function realPluginParams<TOptions = unknown>(params: {
  fileName?: string;
  text?: string;
  options?: TOptions;
}): Promise<PluginParams<TOptions>> {
  const { fileName = 'file.ts', text = '', options = {} } = params;

  const project = await createProject({
    compilerOptions: {
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
    },
    useInMemoryFileSystem: true,
  });
  const sourceFile = project.createSourceFile(fileName, text);

  const getLanguageService = (): ts.LanguageService => project.getLanguageService();

  return {
    options: options as unknown as TOptions,
    fileName,
    rootDir: __dirname,
    text,
    sourceFile,
    getLanguageService,
  };
}
