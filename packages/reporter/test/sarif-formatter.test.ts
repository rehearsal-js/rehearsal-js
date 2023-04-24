import { describe, expect, test } from 'vitest';

import { SarifFormatter } from '../src/formatters/index.js';
import {
  addArtifactData,
  addResultData,
  addRuleData,
  initialData,
} from './fixtures/sarif-formatter/index.js';
import type { Log } from 'sarif';

describe('SarifFormatter', () => {
  test('should set the correct version, $schema, and initial data', () => {
    expect(SarifFormatter.extension).toBe('.sarif');
    expect(SarifFormatter.getReport(initialData)).toMatchSnapshot();
  });

  test('should add a rule only if the rule does not exist in rules', () => {
    const log = JSON.parse(SarifFormatter.getReport(addRuleData)) as Log;

    expect(log.runs[0].tool.driver.rules).toMatchSnapshot();
  });

  test('should have the correct number of results in order, and each result should be assigned the correct property values', () => {
    const log = JSON.parse(SarifFormatter.getReport(addResultData)) as Log;

    expect(log.runs[0].results).toMatchSnapshot();
  });

  test('should add an artifact only if it does not exist, should merge roles and properties correctly', () => {
    const log = JSON.parse(SarifFormatter.getReport(addArtifactData)) as Log;

    expect(log.runs[0].artifacts).toMatchSnapshot();
  });
});
