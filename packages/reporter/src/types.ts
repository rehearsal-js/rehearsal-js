import { Artifact } from 'sarif';

export type ReportSummary = Record<string, unknown> & {
  projectName: string;
  basePath: string;
  tsVersion: string;
  timestamp: string;
};

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

export type FileRole = Extract<
  Artifact.roles,
  'analysisTarget' | 'tracedFile' | 'unmodified' | 'added' | 'deleted' | 'renamed' | 'modified'
>;

export interface ProcessedFile {
  fileName: string;
  updatedText?: string;
  location: {
    line: number | undefined;
    character: number | undefined;
  };
  fixed: boolean;
  code?: string;
  hintAdded: boolean;
  hint?: string;
  roles: FileRole[];
}

export type FileCollection = { [fileName: string]: ProcessedFile };

export interface FixResult {
  analysisTarget: string;
  files: FileCollection;
  fixed: boolean;
  hintAdded: boolean;
}
