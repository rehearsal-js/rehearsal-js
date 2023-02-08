import { isAbsolute, resolve } from 'path';
import { PhysicalLocation, Result } from 'sarif';

import { SarifFormatter } from './sarif-formatter';
import type { Report } from '../types';

interface TextRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

type ErrorLevel = Extract<Result.level, 'error' | 'warning' | 'note'>;

const SONARQUBE_SEVERITY: Record<Result.kind, string> = {
  notApplicable: 'INFO',
  pass: 'INFO',
  fail: 'BLOCKER',
  review: 'CRITICAL',
  open: 'MINOR',
  informational: 'INFO',
};

const SONARQUBE_TYPE: Record<ErrorLevel, string> = {
  note: 'CODE_SMELL',
  warning: 'CODE_SMELL',
  error: 'BUG',
};

function getPhysicalLocation(result: Result): PhysicalLocation | undefined {
  return (result.locations && result.locations[0].physicalLocation) ?? undefined;
}

function getFilePath(physicalLocation: PhysicalLocation): string {
  return physicalLocation?.artifactLocation?.uri ?? '';
}

// SonarQube Formatter will convert to SARIF first and then convert to SonarQube format
// We have to assume the default Report shape
export function sonarqubeFormatter(report: Report): string {
  const issues = [];
  const log = new SarifFormatter(report).buildLog();
  const results = log.runs[0].results || [];

  if (results.length > 0) {
    for (const result of results) {
      const physicalLocation = getPhysicalLocation(result);
      const filePath = physicalLocation ? getFilePath(physicalLocation) : '';
      const absolutePath = isAbsolute(filePath) ? filePath : resolve(process.cwd(), filePath);
      const textRange = getTextRange(physicalLocation);

      issues.push({
        engineId: 'rehearsal-ts',
        ruleId: result.ruleId,
        severity: SONARQUBE_SEVERITY[result.kind ?? 'notApplicable'],
        type: SONARQUBE_TYPE[result.level as ErrorLevel],
        primaryLocation: {
          message: result.message.text ?? '',
          filePath: absolutePath,
          textRange,
        },
      });
    }
  }

  return JSON.stringify({ issues }, null, 2) || '';
}

function getTextRange(location: PhysicalLocation | undefined): TextRange {
  return {
    startLine: getNumber(location, 'startLine'),
    startColumn: getNumber(location, 'startColumn'),
    endLine: getNumber(location, 'endLine'),
    endColumn: getNumber(location, 'endColumn'),
  };
}

//We bump column and line numbers by 1 for sarif reader. Now we revert back the numbers for sonarqube.
function getNumber(
  location: PhysicalLocation | undefined,
  key: 'startLine' | 'startColumn' | 'endLine' | 'endColumn'
): number {
  const region = location?.region;
  if (region && Number.isInteger(region[key]) && region[key]! > 1) {
    return region[key]! - 1;
  }
  return 0;
}
