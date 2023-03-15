import { Log } from 'sarif';
import { describe, expect, test } from 'vitest';

import { sarifFormatter } from '../src/index.js';
import {
  addArtifactData,
  addResultData,
  addRuleData,
  initialData,
} from './fixtures/sarif-formatter/index.js';

describe('Test sarif-formatter', () => {
  test('should set the correct version, $schema, and initial data', () => {
    const sarif = sarifFormatter(initialData);
    expect(sarif).toMatchSnapshot();
  });

  test('should add a rule only if the rule does not exist in rules', () => {
    const sarif = sarifFormatter(addRuleData);
    const log = JSON.parse(sarif) as Log;
    const rules = log.runs[0].tool.driver.rules;

    expect(rules).toMatchSnapshot();
  });

  test('should have the correct number of results in order, and each result should be assigned the correct property values', () => {
    const sarif = sarifFormatter(addResultData);
    const log = JSON.parse(sarif) as Log;
    const results = log.runs[0].results;

    expect(results).toMatchSnapshot();
  });

  test('should add an artifact only if it does not exist, should merge roles and properties correctly', () => {
    const sarif = sarifFormatter(addArtifactData);
    const log = JSON.parse(sarif) as Log;
    const artifacts = log.runs[0].artifacts;

    expect(artifacts).toMatchSnapshot();
  });
});
