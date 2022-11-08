import { resolve } from 'path';
import { readJSONSync } from 'fs-extra';
import { sonarqubeFormatter } from 'src/formatters/sonarqube-formatter';
import { describe, expect, test } from 'vitest';
import type { Report } from '../src/types';

const rehearsalReportJSON: Report = readJSONSync(
  resolve('./test/fixtures/reporter/rehearsal-report.json')
);

describe('Test sonarqueFormatter', () => {
  test('should transform all fields correctly, irregardless of undefined, missing values', () => {
    const sonarqube = sonarqubeFormatter(rehearsalReportJSON);
    expect(sonarqube).matchSnapshot();
  });
});
