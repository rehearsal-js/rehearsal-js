import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { readJSONSync } from 'fs-extra/esm';
import { DiagnosticWithLocation, SourceFile, Node } from 'typescript';
import { afterEach, assert, beforeEach, describe, expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { type Report, jsonFormatter, mdFormatter, Reporter } from '../src/index.js';

describe('Test reporter', function () {
  const basePath = resolve(__dirname, 'fixtures/reporter');
  const testDataPath = resolve(basePath, 'rehearsal-run.json');
  const testData = readJSONSync(testDataPath);
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

  test('load', async () => {
    reporter!.saveCurrentRunToReport(runBasePath, runEntrypoint, timestamp);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const report = (reporter as any).report as Report;

    expect(report.summary.length).toBe(1);
    expect(report.summary[0].basePath).toMatch(/base/);
    expect(report.summary[0].timestamp).toMatch(/\d+/);
    expect(report).toMatchSnapshot();
  });

  test('save', async () => {
    const testSaveFile = resolve(basePath, 'test-save.json');
    reporter!.saveCurrentRunToReport(runBasePath, runEntrypoint, timestamp);
    reporter!.saveReport(testSaveFile);
    expect(existsSync(testSaveFile)).toBeTruthy;
    expect(readFileSync(testSaveFile, 'utf-8')).toMatchSnapshot();

    rmSync(testSaveFile);
  });

  test('print, json', async () => {
    const testPrintJsonFile = resolve(basePath, 'test-print-json.json');
    reporter!.saveCurrentRunToReport(runBasePath, runEntrypoint, timestamp);
    reporter!.printReport(testPrintJsonFile, jsonFormatter);
    expect(existsSync(testPrintJsonFile)).toBeTruthy;
    expect(readFileSync(testPrintJsonFile, 'utf-8')).toMatchSnapshot();

    rmSync(testPrintJsonFile);
  });

  test('print, pull-request-md', async () => {
    const testPrintMdFile = resolve(basePath, 'test-print-md.md');

    reporter!.saveCurrentRunToReport(runBasePath, runEntrypoint, timestamp);
    reporter!.printReport(testPrintMdFile, mdFormatter);
    expect(existsSync(testPrintMdFile)).toBeTruthy;
    expect(readFileSync(testPrintMdFile, 'utf-8')).toMatchSnapshot();

    rmSync(testPrintMdFile);
  });

  test('addItem', async () => {
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

    const testAddItemFile = resolve(basePath, 'test-add-item.json');

    reporter!.saveReport(testAddItemFile);
    expect(existsSync(testAddItemFile)).toBeTruthy;
    expect(readFileSync(testAddItemFile, 'utf-8')).toMatchSnapshot();

    rmSync(testAddItemFile);
  });

  test('getFileNames', async () => {
    reporter!.saveCurrentRunToReport(runBasePath, runEntrypoint, timestamp);
    assert.deepEqual(reporter!.getFileNames(), ['/base/path/file1.ts', '/base/path/file2.ts']);
  });

  test('getItemsByFile', async () => {
    reporter!.saveCurrentRunToReport(runBasePath, runEntrypoint, timestamp);
    const items = reporter!.getItemsByAnalysisTarget('/base/path/file1.ts');
    expect(items).toMatchSnapshot();
  });
});
