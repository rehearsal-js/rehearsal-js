export type ReportSummary = Record<string, unknown> & {
  projectName: string;
  basePath: string;
  tsVersion: string;
  timestamp: string;
};

export type ReportItem = {
  analysisTarget: string;
  fixedFiles: FixedFile[];
  commentedFiles: FixedFile[];
  code: number;
  category: string;
  message: string;
  hint?: string;
  fixed?: boolean;
  nodeKind?: string;
  nodeText?: string;
  nodeLocation: {
    start: number;
    length: number;
    line: number;
    character: number;
  };
};

export type Report = {
  summary: ReportSummary;
  items: ReportItem[];
};

interface FixedFile {
  fileName: string;
  updatedText?: string;
  location: {
    line: number;
    character: number;
  };
}

export interface FixResult {
  fixedFiles: FixedFile[];
  commentedFiles: FixedFile[];
}
