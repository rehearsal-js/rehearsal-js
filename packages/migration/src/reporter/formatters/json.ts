import { Report } from '../reporter';

export default function json(report: Report): string {
  return JSON.stringify(report, null, 2);
}
