export type ReportSummary = Record<string, unknown> & {
  projectName: string;
  basePath: string;
  tsVersion: string;
  timestamp: string;
};

export type FileRole = 'analysisTarget' | 'tracedFile' | 'unmodified' | 'modified';
export type CodeFixAction = 'add' | 'delete' | 'replace';

export interface Location {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface ProcessedFile {
  fileName: string;
  location: Location;
  fixed: boolean;
  code: string | undefined;
  codeFixAction: CodeFixAction | undefined;
  hintAdded: boolean;
  hint: string | undefined;
  roles: FileRole[];
}

export type FileCollection = { [fileName: string]: ProcessedFile };

export type ReportItem = {
  analysisTarget: string;
  files: FileCollection;
  errorCode: number;
  category: string;
  message: string;
  hint?: string;
  fixed?: boolean;
  nodeKind?: string;
  nodeText?: string;
  helpUrl?: string;
  nodeLocation: {
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
