import { createSourceFile, DiagnosticWithLocation } from 'typescript';

export function mockDiagnosticWithLocations(
  partials: Partial<DiagnosticWithLocation>[]
): DiagnosticWithLocation[] {
  return partials.map((partial) => mockDiagnosticWithLocation(partial));
}

export function mockDiagnosticWithLocation(
  partial: Partial<DiagnosticWithLocation>
): DiagnosticWithLocation {
  return {
    file: createSourceFile('test.ts', '', 99),
    start: 0,
    length: 0,
    category: 1,
    code: 0,
    messageText: '',
    ...partial,
  };
}
