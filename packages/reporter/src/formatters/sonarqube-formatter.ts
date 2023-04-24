import { isAbsolute, resolve } from 'node:path';

import { SarifFormatter } from './sarif-formatter.js';
import type { Report, FormatterBase } from '../types.js';
import type { PhysicalLocation, Result } from 'sarif';

interface TextRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

type ErrorLevel = Extract<Result.level, 'error' | 'warning' | 'note'>;

export class SonarqubeFormatter implements FormatterBase {
  static extension = '.sonarqube.json';

  // SonarQube Formatter will convert to SARIF first and then convert to SonarQube format
  // We have to assume the default Report shape
  static getReport(report: Report): string {
    const issues = [];
    const log = new SarifFormatter(report).buildLog();
    const results = log.runs[0].results || [];
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

    // We bump column and line numbers by 1 for sarif reader.
    // Now we revert back the numbers for sonarqube for column.
    function decrementByOne(key: 'startColumn' | 'endColumn', location?: PhysicalLocation): number {
      const region = location?.region;
      if (region && Number.isInteger(region[key]) && region[key]! > 1) {
        return region[key]! - 1;
      }
      return 0;
    }

    function getTextRange(location?: PhysicalLocation): TextRange {
      return {
        startLine: location?.region?.startLine || 0,
        startColumn: decrementByOne('startColumn', location),
        endLine: location?.region?.endLine || 0,
        endColumn: decrementByOne('endColumn', location),
      };
    }

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
}
