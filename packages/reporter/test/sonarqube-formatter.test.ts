import { resolve } from 'node:path';
import { readJSONSync } from 'fs-extra/esm';
import { describe, expect, test } from 'vitest';
import { SonarqubeFormatter } from '../src/formatters/index.js';

import type { Report } from '../src/types.js';

const rehearsalReportJSON = readJSONSync(
  resolve('./test/fixtures/rehearsal-report.json')
) as Report;

describe('SonarqubeFormatter', () => {
  test('should transform all fields correctly, irregardless of undefined, missing values', () => {
    expect(SonarqubeFormatter.getReport(rehearsalReportJSON)).matchSnapshot();
    expect(SonarqubeFormatter.extension).toBe('.sonarqube.json');
  });
});
