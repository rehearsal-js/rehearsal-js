/*
! THE REPORTER OUTPUT IS BOTH A TERMINAL PRINT AND A JSON FILE. SINCE WE DONT WANT _ KEYS IN THE JSON FILE, WE USE CAMEL
*/
export interface ReporterOptions {
  cwd?: string;
  filename?: string;
  projectName?: string;
  tscVersion?: string;
}

export interface ReporterSummary {
  cumulativeErrors: number;
  uniqueCumulativeErrors: number;
  uniqueErrorList: string[];
  autofixedCumulativeErrors: number;
  autofixedUniqueErrorList: string[];
}
export interface Report extends ReporterSummary {
  projectName: string;
  fileCount: number;
  tscVersion: string;
  tscLog: TSCLog[];
  timestamp: string;
}

export interface TSCLog extends ReporterSummary {
  filePath: string;
  errors: TSCLogError[];
}

export interface TSCLogError {
  errorCode: string;
  errorCategory: string;
  errorMessage: string;
  stringLocation: { start: number; end: number };
  helpMessage: string;
  isAutofixed: boolean;
}
