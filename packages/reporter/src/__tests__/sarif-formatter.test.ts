import get from 'lodash.get';
import { describe, expect, test } from 'vitest';

import { sarifFormatter } from '../formatters/sarif-formatter';
import {
  addArtifactData,
  addResultData,
  addRuleData,
  initialData,
} from './fixtures/sarif-formatter';

describe('Test sarif-formatter', () => {
  test('should set the correct version, $schema, and initial data', () => {
    const sarif = sarifFormatter(initialData);
    expect(sarif).toMatchSnapshot();
  });

  test('should add a rule only if the rule does not exist in rules', async () => {
    const sarif = sarifFormatter(addRuleData);
    const rules = getPartialDataByKey(sarif, 'runs[0].tool.driver.rules');

    expect(rules).toMatchSnapshot();
  });

  test('should have the correct number of results in order, and each result should be assigned the correct property values', async () => {
    const sarif = sarifFormatter(addResultData);
    const results = getPartialDataByKey(sarif, 'runs[0].results');

    expect(results).toMatchSnapshot();
  });

  test('should add an artifact only if it does not exist, should merge roles and properties correctly', async () => {
    const sarif = sarifFormatter(addArtifactData);
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
