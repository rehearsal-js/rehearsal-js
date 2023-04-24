import type { Report, FormatterBase } from '../types.js';

export class JSONFormatter implements FormatterBase {
  static extension = '.json';
  static getReport(report: Report): string {
    return JSON.stringify(report, null, 2);
  }
}
