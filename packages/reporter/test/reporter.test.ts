import { existsSync, readFileSync, rmSync } from 'fs';
import { resolve } from 'path';
import { DiagnosticWithLocation, SourceFile } from 'typescript';
import { beforeEach, describe, expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { jsonFormatter, mdFormatter, Reporter } from '../src';

describe('Test reporter', function () {
  const basePath = resolve(__dirname, 'fixtures/reporter');

  let reporter: Reporter;

  beforeEach(() => {
    reporter = new Reporter('test', basePath).load(resolve(basePath, 'rehearsal-report.json'));
  });

  test('load', async () => {
    const report = reporter.report;

    expect(report.tool.driver.properties?.basePath).toMatch(/base/);
    expect(report.tool.driver.properties?.timestamp).toMatch(/\d+/);
    expect(report).toMatchSnapshot();
  });

  test('save', async () => {
    const testSaveFile = resolve(basePath, 'test-save.json');

    reporter!.save(testSaveFile);
    expect(existsSync(testSaveFile)).toBeTruthy;
    expect(readFileSync(testSaveFile, 'utf-8')).toMatchSnapshot();

    rmSync(testSaveFile);
  });

  test('print, json', async () => {
    const testPrintJsonFile = resolve(basePath, 'test-print-json.json');

    reporter!.print(testPrintJsonFile, jsonFormatter);
    expect(existsSync(testPrintJsonFile)).toBeTruthy;
    expect(readFileSync(testPrintJsonFile, 'utf-8')).toMatchSnapshot();

    rmSync(testPrintJsonFile);
  });

  test('print, pull-request-md', async () => {
    const testPrintMdFile = resolve(basePath, 'test-print-md.md');

    reporter!.print(testPrintMdFile, mdFormatter);
    expect(existsSync(testPrintMdFile)).toBeTruthy;
    expect(readFileSync(testPrintMdFile, 'utf-8')).toMatchSnapshot();

    rmSync(testPrintMdFile);
  });

  test('addItem', async () => {
    const mockSourceFile = mock<SourceFile>();
    mockSourceFile.fileName = 'testFile1.ts';
    mockSourceFile.getLineAndCharacterOfPosition.mockReturnValue({ line: 0, character: 5 });

    const mockDiagnostic = mock<DiagnosticWithLocation>();
    mockDiagnostic.file = mockSourceFile;
    mockDiagnostic.category = 1;
    mockDiagnostic.messageText = 'unused variable';
    mockDiagnostic.code = 1000;
    mockDiagnostic.length = 5;

    const files = {
      '/base/path/testFile.ts': {
        fileName: '/base/path/testFile.ts',
        location: { startLine: 3, startColumn: 7, endLine: 3, endColumn: 12 },
        fixed: false,
        code: undefined,
        codeFixAction: undefined,
        hint: 'This is the hint.',
        hintAdded: true,
        roles: ['analysisTarget' as const, 'unmodified' as const],
      },
    };

    reporter!.addItem(mockDiagnostic, files, false, undefined);

    const testAddItemFile = resolve(basePath, 'test-add-item.json');

    reporter!.save(testAddItemFile);
    expect(existsSync(testAddItemFile)).toBeTruthy;
    expect(readFileSync(testAddItemFile, 'utf-8')).toMatchSnapshot();

    rmSync(testAddItemFile);
  });
});
