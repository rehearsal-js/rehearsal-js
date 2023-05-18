export type CustomImportResolver = (
  contentType: 'ecmascript' | 'typescript',
  content: string
) => string[];
