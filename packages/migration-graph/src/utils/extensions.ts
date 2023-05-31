export const SUPPORTED_TS_EXTENSIONS = ['.ts', '.gts', '.tsx', '.mts'] as const;
export const SUPPORTED_JS_EXTENSIONS = ['.js', '.gjs', '.jsx', '.mjs'] as const;

export const SUPPORTED_EXTENSION = [
  ...SUPPORTED_TS_EXTENSIONS,
  ...SUPPORTED_JS_EXTENSIONS,
  '.hbs',
] as const;
