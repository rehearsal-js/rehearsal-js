export type ReportSummary = Record<string, unknown> & {
  projectName: string;
  basePath: string;
  tsVersion: string;
  timestamp: string;
  commandName: string;
};

export interface Location {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export type ReportItem = {
  analysisTarget: string;
  errorCode: number;
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

export type Report = {
  summary: ReportSummary;
  items: ReportItem[];
};

export type ReportFormatter = (report: Report) => string;
