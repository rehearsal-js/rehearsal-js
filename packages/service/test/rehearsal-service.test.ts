import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import { RehearsalService } from '../src/index.js';
import type { CompilerOptions, DiagnosticWithLocation } from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Test service', function () {
  const basePath = resolve(__dirname, 'fixtures');
  const fileName = resolve(basePath, 'dummy.ts');
  const fileNames = [fileName];
  const originalFileContent = readFileSync(fileName).toString();

  const options: CompilerOptions = {};

  test('construct', () => {
    const service = new RehearsalService(options, fileNames);

    expect(service).toEqual(expect.anything());
    expect(service.getLanguageService()).toEqual(expect.anything());
  });

  test('getFileText', () => {
    const service = new RehearsalService(options, fileNames);

    expect(function () {
      service.getFileText('oops.ts');
    }).toThrow("Cannot read properties of undefined (reading 'snapshot')");

    expect(service.getFileText(fileName)).toEqual(originalFileContent);
  });

  test('setFileText', () => {
    const service = new RehearsalService(options, fileNames);

    service.setFileText(fileName, 'class Real {\n  \n}\n');

    expect(service.getFileText(fileName)).toEqual('class Real {\n  \n}\n');
  });

  test('setFileText', () => {
    const service = new RehearsalService(options, fileNames);
    const originalContent = readFileSync(fileName).toString();

    service.setFileText(fileName, 'class Real {\n  \n}\n');

    expect(readFileSync(fileName).toString()).toEqual(originalFileContent);

    service.saveFile(fileName);

    expect(readFileSync(fileName).toString()).toEqual('class Real {\n  \n}\n');

    writeFileSync(fileName, originalContent);

    expect(readFileSync(fileName).toString()).toEqual(originalFileContent);
  });

  test('getSourceFile', () => {
    const service = new RehearsalService(options, fileNames);

    expect(service.getSourceFile('oops')).toBeUndefined();

    expect(service.getSourceFile(fileName)).toBeTypeOf('object');
    expect(service.getSourceFile(fileName).text).toEqual(originalFileContent);
  });

  test('getDiagnostics', () => {
    const service = new RehearsalService(options, fileNames);

    let diagnostics: DiagnosticWithLocation[];

    diagnostics = service.getDiagnostics(fileName);

    expect(diagnostics).toHaveLength(0);

    // Add error to the file content
    service.setFileText(fileName, 'class Dummy {\n  \n}\n oops();\n');
    diagnostics = service.getDiagnostics(fileName);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].code).toEqual(2304);
    expect(diagnostics[0].messageText).toEqual(`Cannot find name 'oops'.`);
  });
});
