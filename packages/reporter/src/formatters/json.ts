import { Report } from '../types';

export function json(report: Report): string {
  return JSON.stringify(report, null, 2);
}
