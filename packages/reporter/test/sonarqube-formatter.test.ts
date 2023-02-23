import { resolve } from 'node:path';
import { readJSONSync } from 'fs-extra';
import { describe, expect, test } from 'vitest';

import { sonarqubeFormatter } from '../src/index.js';
import type { Report } from '../src/types.js';

const rehearsalReportJSON: Report = readJSONSync(
  resolve('./test/fixtures/reporter/rehearsal-report.json')
);

describe('Test sonarqueFormatter', () => {
  test('should transform all fields correctly, irregardless of undefined, missing values', () => {
    const sonarqube = sonarqubeFormatter(rehearsalReportJSON);
    expect(sonarqube).matchSnapshot();
  });
});
