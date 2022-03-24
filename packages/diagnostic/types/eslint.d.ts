declare module 'eslint' {
  type LintReport = {
    output: string;
  };
  class ESLint {
    constructor(options: { fix: boolean; useEslintrc: boolean });
    lintText(text: string, options?: { filePath: string }): Promise<[LintReport]>;
  }
  export = ESLint;
}
