import { resolve } from 'path';
import { readJSONSync } from 'fs-extra';
import { describe, expect, test } from 'vitest';
import { sonarqubeFormatter } from '../formatters/sonarqube-formatter';
import type { Report } from '../types';

const rehearsalReportJSON: Report = readJSONSync(
  resolve('./test/fixtures/reporter/rehearsal-report.json')
);

describe('Test sonarqueFormatter', () => {
  test('should transform all fields correctly, irregardless of undefined, missing values', () => {
    const sonarqube = sonarqubeFormatter(rehearsalReportJSON);
    expect(sonarqube).matchSnapshot();
  });
});
