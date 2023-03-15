import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJSONSync } from 'fs-extra/esm';
import { DiagnosticWithLocation, SourceFile, Node } from 'typescript';
import { afterEach, assert, beforeEach, describe, expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { jsonFormatter, mdFormatter, Reporter } from '../src/index.js';
import { Run } from '../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Test reporter', function () {
  const basePath = resolve(__dirname, 'fixtures/reporter');
  const testDataPath = resolve(basePath, 'rehearsal-run.json');
  const testData = readJSONSync(testDataPath) as Run;
  const timestamp = testData.runSummary.timestamp;
  const runBasePath = testData.runSummary.basePath;
  const runEntrypoint = testData.runSummary.entrypoint;

  let reporter: Reporter | undefined;

  beforeEach(() => {
    reporter = new Reporter({
      tsVersion: '',
      projectName: 'test',
      basePath,
      commandName: '@rehearsal/reporter',
    }).loadRun(testDataPath);
  });

  afterEach(() => {
    reporter = undefined;
  });

  test('load', () => {
    reporter!.saveCurrentRunToReport(runBasePath, runEntrypoint, timestamp);

    const report = reporter!.report;

    expect(report.summary.length).toBe(1);
    expect(report.summary[0].basePath).toMatch(/base/);
    expect(report.summary[0].timestamp).toMatch(/\d+/);
    expect(report).toMatchSnapshot();
  });

  test('save', () => {
    const testSaveFile = resolve(basePath, 'test-save.json');
    reporter!.saveCurrentRunToReport(runBasePath, runEntrypoint, timestamp);
    reporter!.saveReport(testSaveFile);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(existsSync(testSaveFile)).toBeTruthy;
    expect(readFileSync(testSaveFile, 'utf-8')).toMatchSnapshot();

    rmSync(testSaveFile);
  });

  test('print, json', () => {
    const testPrintJsonFile = resolve(basePath, 'test-print-json.json');
    reporter!.saveCurrentRunToReport(runBasePath, runEntrypoint, timestamp);
    reporter!.printReport(testPrintJsonFile, jsonFormatter);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(existsSync(testPrintJsonFile)).toBeTruthy;
    expect(readFileSync(testPrintJsonFile, 'utf-8')).toMatchSnapshot();

    rmSync(testPrintJsonFile);
  });

  test('print, pull-request-md', () => {
    const testPrintMdFile = resolve(basePath, 'test-print-md.md');

    reporter!.saveCurrentRunToReport(runBasePath, runEntrypoint, timestamp);
    reporter!.printReport(testPrintMdFile, mdFormatter);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(existsSync(testPrintMdFile)).toBeTruthy;
    expect(readFileSync(testPrintMdFile, 'utf-8')).toMatchSnapshot();

    rmSync(testPrintMdFile);
  });

  test('addTSItem', () => {
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

    reporter!.addTSItemToRun(mockDiagnostic, mockNode, location, hint);
    reporter!.saveCurrentRunToReport(runBasePath, runEntrypoint, timestamp);

    const testAddTSItemFile = resolve(basePath, 'test-add-item.json');

    reporter!.saveReport(testAddTSItemFile);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(existsSync(testAddTSItemFile)).toBeTruthy;
    expect(readFileSync(testAddTSItemFile, 'utf-8')).toMatchSnapshot();

    rmSync(testAddTSItemFile);
  });

  test('addLintItem', () => {
    const lintError = {
      ruleId: null,
      message: 'Parsing error: require() of ES Module...from require-from-eslint.js not supported',
      line: undefined,
      column: undefined,
    };

    reporter!.addLintItemToRun('testFile1.ts', lintError);
    reporter!.saveCurrentRunToReport(runBasePath, runEntrypoint, timestamp);

    const testAddLintItemFile = resolve(basePath, 'test-add-lint-item.json');

    reporter!.saveReport(testAddLintItemFile);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(existsSync(testAddLintItemFile)).toBeTruthy;
    expect(readFileSync(testAddLintItemFile, 'utf-8')).toMatchSnapshot();

    rmSync(testAddLintItemFile);
  });

  test('getFileNames', () => {
    reporter!.saveCurrentRunToReport(runBasePath, runEntrypoint, timestamp);
    assert.deepEqual(reporter!.getFileNames(), ['/base/path/file1.ts', '/base/path/file2.ts']);
  });

  test('getItemsByFile', () => {
    reporter!.saveCurrentRunToReport(runBasePath, runEntrypoint, timestamp);
    const items = reporter!.getItemsByAnalysisTarget('/base/path/file1.ts');
    expect(items).toMatchSnapshot();
  });
});
