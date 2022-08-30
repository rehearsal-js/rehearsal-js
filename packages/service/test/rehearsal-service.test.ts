import ts from 'typescript';
import fs from 'fs';

import { describe, expect, test } from 'vitest';
import { resolve } from 'path';

import { RehearsalService } from '../src';

describe('Test service', function () {
  const basePath = resolve(__dirname, 'fixtures');
  const fileName = resolve(basePath, 'dummy.ts');
  const fileNames = [fileName];
  const originalFileContent = fs.readFileSync(fileName).toString();

  const options: ts.CompilerOptions = {};

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
    const originalContent = fs.readFileSync(fileName).toString();

    service.setFileText(fileName, 'class Real {\n  \n}\n');

    expect(fs.readFileSync(fileName).toString()).toEqual(originalFileContent);

    service.saveFile(fileName);

    expect(fs.readFileSync(fileName).toString()).toEqual('class Real {\n  \n}\n');

    fs.writeFileSync(fileName, originalContent);

    expect(fs.readFileSync(fileName).toString()).toEqual(originalFileContent);
  });

  test('getSourceFile', async () => {
    const service = new RehearsalService(options, fileNames);

    expect(service.getSourceFile('oops')).toBeUndefined();

    expect(service.getSourceFile(fileName)).toBeTypeOf('object');
    expect(service.getSourceFile(fileName).text).toEqual(originalFileContent);
  });

  test('getSemanticDiagnosticsWithLocation', async () => {
    const service = new RehearsalService(options, fileNames);

    let diagnostics: ts.DiagnosticWithLocation[];

    diagnostics = service.getSemanticDiagnosticsWithLocation(fileName);

    expect(diagnostics).toHaveLength(0);

    // Add error to the file content
    service.setFileText(fileName, 'class Dummy {\n  \n}\n oops();\n');
    diagnostics = service.getSemanticDiagnosticsWithLocation(fileName);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].code).toEqual(2304);
    expect(diagnostics[0].messageText).toEqual(`Cannot find name 'oops'.`);
  });

  test('resolveModuleName, existing module', async () => {
    const service = new RehearsalService(options, fileNames);

    const path = service.resolveModuleName('typescript', fileName);

    expect(path).toContain('node_modules/typescript');
  });

  test('resolveModuleName, non-existing module', async () => {
    const service = new RehearsalService(options, fileNames);

    const path = service.resolveModuleName('this-module-is-not-exists', fileName);

    expect(path).toBeUndefined();
  });
});
