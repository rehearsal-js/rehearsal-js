import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DiagnosticWithLocation, SourceFile, Node } from 'typescript';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { Project } from 'fixturify-project';
import { Reporter } from '../src/index.js';
import { prepareProject, getJSONReport } from './test-helpers.js';

describe('Reporter', () => {
  let reporter: Reporter;
  let project: Project;
  let reportDirectory: string;
  const currentRunTimestamp = '9/16/2022, 13:24:57';

  beforeEach(async () => {
    project = prepareProject('rehearsal-report.json');

    await project.write();

    reporter = new Reporter({
      tsVersion: '',
      projectName: 'test',
      projectRootDir: project.baseDir,
    });

    reporter.currentRun = getJSONReport('rehearsal-run.json');
    reportDirectory = resolve(project.baseDir, 'reports');
  });

  afterEach(() => {
    project.dispose();
  });

  test('saveCurrentRunToReport', () => {
    // current run is being set in beforeEach
    reporter.saveCurrentRunToReport(currentRunTimestamp);

    const report = reporter.report;

    expect(report.summary.length).toBe(1);
    expect(report.summary[0].timestamp).toMatch(/\d+/);
    expect(report).toMatchSnapshot();
  });

  test('printReport default formatter', () => {
    reporter.saveCurrentRunToReport(currentRunTimestamp);
    reporter.printReport(reportDirectory);

    expect(existsSync(reportDirectory)).toBe(true);
    expect(
      readFileSync(resolve(reportDirectory, 'rehearsal-report.json'), 'utf-8')
    ).toMatchSnapshot();
  });

  test('printReport sarif formatter', () => {
    reporter.saveCurrentRunToReport(currentRunTimestamp);
    reporter.printReport(reportDirectory, ['sarif']);

    expect(existsSync(reportDirectory)).toBe(true);
    expect(
      readFileSync(resolve(reportDirectory, 'rehearsal-report.sarif'), 'utf-8')
    ).toMatchSnapshot();
  });

  test('printReport sonarqube formatter', () => {
    reporter.saveCurrentRunToReport(currentRunTimestamp);
    reporter.printReport(reportDirectory, ['sonarqube']);

    expect(existsSync(reportDirectory)).toBe(true);
    expect(
      readFileSync(resolve(reportDirectory, 'rehearsal-report.sonarqube.json'), 'utf-8')
    ).toMatchSnapshot();
  });

  test('printReport md formatter', () => {
    reporter.saveCurrentRunToReport(currentRunTimestamp);
    reporter.printReport(reportDirectory, ['md']);

    expect(existsSync(reportDirectory)).toBe(true);
    expect(
      readFileSync(resolve(reportDirectory, 'rehearsal-report.md'), 'utf-8')
    ).toMatchSnapshot();
  });

  test('addTSItemToRun', () => {
    const mockSourceFile = mock<SourceFile>();
    mockSourceFile.fileName = 'testFile1.ts';
    mockSourceFile.getLineAndCharacterOfPosition.mockReturnValue({ line: 0, character: 5 });

    const mockNode = mock<Node>();
    mockNode.getText.mockReturnValue('var1');
    Object.defineProperty(mockNode, 'kind', {
      value: 'Identifier',
      configurable: true,
      writable: true,
    });

    const mockDiagnostic = mock<DiagnosticWithLocation>();
    mockDiagnostic.file = mockSourceFile;
    mockDiagnostic.category = 1;
    mockDiagnostic.messageText = 'unused variable';
    mockDiagnostic.code = 1000;
    mockDiagnostic.length = 5;

    const location = { startLine: 3, startColumn: 7, endLine: 3, endColumn: 12 };
    const hint = 'This is the hint.';

    reporter.addTSItemToRun(mockDiagnostic, mockNode, location, hint);
    reporter.saveCurrentRunToReport(currentRunTimestamp);
    reporter.printReport(reportDirectory);

    expect(existsSync(reportDirectory)).toBe(true);
    expect(
      readFileSync(resolve(reportDirectory, 'rehearsal-report.json'), 'utf-8')
    ).toMatchSnapshot();
  });

  test('addLintItemToRun', () => {
    const lintError = {
      ruleId: null,
      message: 'Parsing error: require() of ES Module...from require-from-eslint.js not supported',
      line: undefined,
      column: undefined,
    };

    reporter.addLintItemToRun('testFile1.ts', lintError);
    reporter.saveCurrentRunToReport(currentRunTimestamp);
    reporter.printReport(reportDirectory);

    expect(existsSync(reportDirectory)).toBe(true);
    expect(
      readFileSync(resolve(reportDirectory, 'rehearsal-report.json'), 'utf-8')
    ).toMatchSnapshot();
  });

  test('getFileNames', () => {
    reporter.saveCurrentRunToReport(currentRunTimestamp);

    expect(reporter.getFileNames()).toStrictEqual(['/base/path/file1.ts', '/base/path/file2.ts']);
  });

  test('getItemsByAnalysisTarget', () => {
    reporter.saveCurrentRunToReport(currentRunTimestamp);
    const items = reporter.getItemsByAnalysisTarget('/base/path/file1.ts');

    expect(items).toMatchSnapshot();
  });
});
