import { resolve } from 'node:path';
import { readJSONSync } from 'fs-extra/esm';
import { describe, expect, test } from 'vitest';
import { JSONFormatter } from '../src/formatters/index.js';

import type { Report } from '../src/types.js';

const rehearsalReportJSON = readJSONSync(
  resolve('./test/fixtures/rehearsal-report.json')
) as Report;

describe('JSONFormatter', () => {
  test('should transform all fields correctly, irregardless of undefined, missing values', () => {
    expect(JSONFormatter.getReport(rehearsalReportJSON)).matchSnapshot();
    expect(JSONFormatter.extension).toBe('.json');
  });
});
