export type Formatters = 'json' | 'sonarqube' | 'md' | 'sarif';

export type ReportSummary = Record<string, unknown> & {
  projectName: string;
  tsVersion: string;
  timestamp: string;
};

export interface Location {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export enum ReportItemType {
  ts = 0,
  lint = 1,
  glint = 2,
}

export type ReportItem = {
  analysisTarget: string;
  type: ReportItemType;
  ruleId: string;
  category: string;
  message: string;
  hint?: string;
  hintAdded?: boolean;
  nodeKind?: string;
  nodeText?: string;
  helpUrl?: string;
  nodeLocation?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
};

export interface LintErrorLike {
  message: string;
  ruleId: string | null;
  line?: number;
  column?: number;
  nodeType?: string;
  messageId?: string;
  endLine?: number;
  endColumn?: number;
}

export type Report = {
  summary: ReportSummary[];
  fixedItemCount: number;
  items: ReportItem[];
};

export type ReportFormatter = (report: Report) => string;

export interface Run {
  runSummary: ReportSummary;
  fixedItemCount: number;
  items: ReportItem[];
}

// ts doesnt allow for static properties on interfaces yet
export class FormatterBase {
  static extension: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static getReport(_report: Report): string {
    return '';
  }
}
