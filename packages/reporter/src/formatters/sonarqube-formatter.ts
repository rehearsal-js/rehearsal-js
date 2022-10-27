import { isAbsolute, resolve } from 'path';
import { Log, PhysicalLocation, Result } from 'sarif';

interface FormatterOptions {
  cwd: string;
  outputFile?: string;
}

const SONARQUBE_SEVERITY: Record<Result.kind, string> = {
  notApplicable: 'INFO',
  pass: 'INFO',
  fail: 'BLOCKER',
  review: 'CRITICAL',
  open: 'MINOR',
  informational: 'INFO',
};
type ErrorLevel = Extract<Result.level, 'error' | 'warning' | 'note'>;
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

export function sonarqubeFormatter(log: Log, options: FormatterOptions): string | undefined {
  const issues = [];

  const run = log.runs[0];
  const results = run.results || [];

  if (results.length > 0) {
    for (const result of results) {
      const physicalLocation = getPhysicalLocation(result);
      const filePath = physicalLocation ? getFilePath(physicalLocation) : '';
      const absolutePath = isAbsolute(filePath) ? filePath : resolve(options.cwd, filePath);

      issues.push({
        engineId: 'rehearsal-ts',
        ruleId: result.ruleId,
        severity: SONARQUBE_SEVERITY[result.kind ?? 'notApplicable'],
        type: SONARQUBE_TYPE[result.level as ErrorLevel],
        primaryLocation: {
          message: result.message.text ?? '',
          filePath: absolutePath,
          textRange: {
            startLine: physicalLocation?.region?.startLine ?? 0,
            startColumn: physicalLocation?.region?.startColumn ?? 0,
            endLine: physicalLocation?.region?.endLine ?? 0,
            endColumn: physicalLocation?.region?.endColumn ?? 0,
          },
        },
      });
    }
    return JSON.stringify({ issues }, null, 2);
  }
}
