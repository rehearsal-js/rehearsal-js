import { describe, expect, test } from 'vitest';
import { RehearsalService } from '@rehearsal/service';
import { Reporter } from '@rehearsal/reporter';
import { DiagnosticFixPlugin } from '../src';
import { mockDiagnosticWithLocations } from './utils';

const REPORTER = new Reporter({
  projectName: '',
  basePath: '',
  commandName: '',
  tsVersion: '',
});

describe('Test DiagnosticFixPlugin', function () {
  test('sort', async () => {
    const diagnostics = mockDiagnosticWithLocations([
      { start: 5, code: 100 },
      { start: 3, code: 300 },
      { start: 1, code: 100 },
      { start: 2, code: 200 },
      { start: 4, code: 200 },
    ]);

    const plugin = new DiagnosticFixPlugin(new RehearsalService({}, []), REPORTER);

    plugin.sort(diagnostics, []);

    expect(diagnostics).toEqual(
      mockDiagnosticWithLocations([
        { start: 1, code: 100 },
        { start: 2, code: 200 },
        { start: 3, code: 300 },
        { start: 4, code: 200 },
        { start: 5, code: 100 },
      ])
    );
  });

  test('sort with priorities', async () => {
    const diagnostics = mockDiagnosticWithLocations([
      { start: 9, code: 200 },
      { start: 8, code: 100 },
      { start: 7, code: 300 },
      { start: 6, code: 100 },
      { start: 5, code: 400 },
      { start: 0, code: 100 },
      { start: 1, code: 200 },
      { start: 2, code: 100 },
      { start: 3, code: 300 },
      { start: 4, code: 100 },
    ]);

    const plugin = new DiagnosticFixPlugin(new RehearsalService({}, []), REPORTER);

    plugin.sort(diagnostics, [300, 200]);

    expect(diagnostics).toEqual(
      mockDiagnosticWithLocations([
        // Prioritized code 300 moved on top, internally sorted by start position
        { start: 3, code: 300 },
        { start: 7, code: 300 },
        // Prioritized code 200, internally sorted by start position
        { start: 1, code: 200 },
        { start: 9, code: 200 },
        // The rest of diagnostics sorted by start position
        { start: 0, code: 100 },
        { start: 2, code: 100 },
        { start: 4, code: 100 },
        { start: 5, code: 400 },
        { start: 6, code: 100 },
        { start: 8, code: 100 },
      ])
    );

    // Swap priorities
    plugin.sort(diagnostics, [200, 300]);

    expect(diagnostics).toEqual(
      mockDiagnosticWithLocations([
        // Prioritized code 200 moved on top, internally sorted by start position
        { start: 1, code: 200 },
        { start: 9, code: 200 },
        // Prioritized code 300, internally sorted by start position
        { start: 3, code: 300 },
        { start: 7, code: 300 },
        // The rest of diagnostics sorted by start position
        { start: 0, code: 100 },
        { start: 2, code: 100 },
        { start: 4, code: 100 },
        { start: 5, code: 400 },
        { start: 6, code: 100 },
        { start: 8, code: 100 },
      ])
    );
  });
});
