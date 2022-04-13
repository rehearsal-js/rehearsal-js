export type ReportSummary = Record<string, unknown> & {
  projectName: string;
  basePath: string;
  tsVersion: string;
  timestamp: string;
};

export type ReportItem = {
  file: string;
  code: number;
  category: string;
  message: string;
  hint?: string;
  fixed?: boolean;
  nodeKind?: string;
  nodeText?: string;
  location: {
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
