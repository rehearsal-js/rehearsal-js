import type { Report } from '../types.js';

export function jsonFormatter(report: Report): string {
  return JSON.stringify(report, null, 2);
}
