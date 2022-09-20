import { readFileSync } from 'fs';
import get from 'lodash.get';
import { resolve } from 'path';
import { describe, expect, test } from 'vitest';

import { type Report, sarifFormatter } from '../src';

describe('Test sarif-formatter', () => {
  const fixtureDir = resolve(__dirname, './fixtures/sarif-formatter/');
  test('should set the correct version, $schema, and initial data', () => {
    const data = getTestData(fixtureDir, 'initial-data.json');
    const sarif = sarifFormatter(data);
    expect(sarif).toMatchSnapshot();
  });

  test('should add a rule only if the rule does not exist in rules', async () => {
    const data = getTestData(fixtureDir, 'add-rule.json');
    const sarif = sarifFormatter(data);
    const rules = getPartialDataByKey(sarif, 'runs[0].tool.driver.rules');

    expect(rules).toMatchSnapshot();
  });

  test('should have the correct number of results in order, and each result should be assigned the correct property values', async () => {
    const data = getTestData(fixtureDir, 'add-result.json');
    const sarif = sarifFormatter(data);
    const results = getPartialDataByKey(sarif, 'runs[0].results');

    expect(results).toMatchSnapshot();
  });

  test('should add an artifact only if it does not exist, should merge roles and properties correctly', async () => {
    const data = getTestData(fixtureDir, 'add-artifact.json');
    const sarif = sarifFormatter(data);
    const artifacts = getPartialDataByKey(sarif, 'runs[0].artifacts');

    expect(artifacts).toMatchSnapshot();
  });
});

function getPartialDataByKey(sarif: string, key: string): string {
  const parsedSarif = JSON.parse(sarif);
  const parsedPartialData = get(parsedSarif, key);
  const partialData = JSON.stringify(parsedPartialData, null, 2);
  return partialData;
}

function getTestData(basePath: string, file: string): Report {
  const fullPath = resolve(basePath, file);
  const data = JSON.parse(readFileSync(fullPath, 'utf-8'));
  return data;
}
