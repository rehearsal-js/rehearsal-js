declare module 'module-c' {
  const moduleC: {
    getFullName(f: string, l: string): string;
    getCharCountInName(s: string): number;
  };
  export = moduleC;
}
