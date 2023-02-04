import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, test } from 'vitest';

import { RehearsalService } from '../src';
import type { CompilerOptions, DiagnosticWithLocation } from 'typescript';

describe('Test service', function () {
  const basePath = resolve(__dirname, 'fixtures');
  const fileName = resolve(basePath, 'dummy.ts');
  const fileNames = [fileName];
  const originalFileContent = readFileSync(fileName).toString();

  const options: CompilerOptions = {};

  test('construct', async () => {
    const service = new RehearsalService(options, fileNames);

    expect(service).toEqual(expect.anything());
    expect(service.getLanguageService()).toEqual(expect.anything());
  });

  test('getFileText', async () => {
    const service = new RehearsalService(options, fileNames);

    expect(function () {
      service.getFileText('oops.ts');
    }).toThrow("Cannot read properties of undefined (reading 'snapshot')");

    expect(service.getFileText(fileName)).toEqual(originalFileContent);
  });

  test('setFileText', async () => {
    const service = new RehearsalService(options, fileNames);

    service.setFileText(fileName, 'class Real {\n  \n}\n');

    expect(service.getFileText(fileName)).toEqual('class Real {\n  \n}\n');
  });

  test('setFileText', async () => {
    const service = new RehearsalService(options, fileNames);
    const originalContent = readFileSync(fileName).toString();

    service.setFileText(fileName, 'class Real {\n  \n}\n');

    expect(readFileSync(fileName).toString()).toEqual(originalFileContent);

    service.saveFile(fileName);

    expect(readFileSync(fileName).toString()).toEqual('class Real {\n  \n}\n');

    writeFileSync(fileName, originalContent);

    expect(readFileSync(fileName).toString()).toEqual(originalFileContent);
  });

  test('getSourceFile', async () => {
    const service = new RehearsalService(options, fileNames);

    expect(service.getSourceFile('oops')).toBeUndefined();

    expect(service.getSourceFile(fileName)).toBeTypeOf('object');
    expect(service.getSourceFile(fileName).text).toEqual(originalFileContent);
  });

  test('getSemanticDiagnosticsWithLocation', async () => {
    const service = new RehearsalService(options, fileNames);

    let diagnostics: DiagnosticWithLocation[];

    diagnostics = service.getSemanticDiagnosticsWithLocation(fileName);

    expect(diagnostics).toHaveLength(0);

    // Add error to the file content
    service.setFileText(fileName, 'class Dummy {\n  \n}\n oops();\n');
    diagnostics = service.getSemanticDiagnosticsWithLocation(fileName);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].code).toEqual(2304);
    expect(diagnostics[0].messageText).toEqual(`Cannot find name 'oops'.`);
  });
});
