import { CodeFixes } from './codefixInformationMap.generated.js';

export const isCodeFixSupported = (fixId: string): boolean => {
  return fixId in CodeFixes;
};

export const SUPPORTED_DIAGNOSTICS = Object.values(CodeFixes).flatMap((entry) =>
  entry.diagnostics.map((d) => d.code)
);
