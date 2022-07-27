import { Report } from '../types';

export function jsonFormatter(report: Report): string {
  return JSON.stringify(report, null, 2);
}
