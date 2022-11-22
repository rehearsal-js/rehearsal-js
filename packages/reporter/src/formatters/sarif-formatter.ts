import { Log } from 'sarif';

import { Report } from '../types';

export class SarifFormatter {
  private report: Report;

  constructor(report: Report) {
    this.report = report;
  }

  format(): string {
    return JSON.stringify(this.report, null, 2);
  }

  buildLog(): Log {
    return {
      version: '2.1.0' as const,
      $schema: 'http://json.schemastore.org/sarif-2.1.0-rtm.4',
      runs: Array.isArray(this.report) ? this.report : [this.report],
    };
  }
}
export function sarifFormatter(report: Report): string {
  const formatter = new SarifFormatter(report);
  return formatter.format();
}
