import { sonarqubeFormatter } from 'src/formatters/sonarqube-formatter';
import { describe, expect, test } from 'vitest';

import { resultsData } from './fixtures/sonarqube-formatter/results-data.ts';

describe('Test sonarqueFormatter', () => {
  test('should transform all fields correctly, irregardless of undefined, missing values', () => {
    const sonarqube = sonarqubeFormatter(resultsData, {cwd: '/base/path/'});
    expect(sonarqube).matchSnapshot();
  });
});
