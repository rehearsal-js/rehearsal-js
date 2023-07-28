import { createSourceFile, DiagnosticWithLocation } from 'typescript';
import { describe, expect, test } from 'vitest';
import { getDiagnosticOrder } from '../src/get-diagnostics.js';

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

describe('Test DiagnosticFixPlugin', () => {
  test('sort', () => {
    const diagnostics = mockDiagnosticWithLocations([
      { start: 5, code: 2790 },
      { start: 3, code: 4082 },
      { start: 1, code: 7006 },
      { start: 2, code: 7050 },
      { start: 4, code: 18046 },
    ]);

    expect(getDiagnosticOrder(diagnostics)).toEqual(
      mockDiagnosticWithLocations([
        { start: 1, code: 7006 },
        { start: 2, code: 7050 },
        { start: 3, code: 4082 },
        { start: 4, code: 18046 },
        { start: 5, code: 2790 },
      ])
    );
  });

  test('sort with priorities', () => {
    const diagnostics = mockDiagnosticWithLocations([
      { start: 9, code: 7044 },
      { start: 8, code: 2322 },
      { start: 7, code: 7010 },
      { start: 6, code: 2345 },
      { start: 5, code: 7050 },
      { start: 0, code: 80002 },
      { start: 1, code: 7044 },
      { start: 2, code: 2678 },
      { start: 3, code: 4082 },
      { start: 4, code: 99999 },
    ]);

    expect(getDiagnosticOrder(diagnostics).map((d) => ({ start: d.start, code: d.code }))).toEqual([
      { start: 7, code: 7010 },
      { start: 1, code: 7044 },
      { start: 9, code: 7044 },
      { start: 5, code: 7050 },
      { start: 2, code: 2678 },
      { start: 3, code: 4082 },
      { start: 6, code: 2345 },
      { start: 8, code: 2322 },
    ]);
  });
});
