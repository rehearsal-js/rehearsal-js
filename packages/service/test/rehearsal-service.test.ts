import ts from 'typescript';
import fs from 'fs';

import { assert, expect } from 'chai';
import { describe, it } from 'mocha';
import { resolve } from 'path';

import { RehearsalService } from '../src';

const basePath = resolve(__dirname, 'fixtures');
const fileName = resolve(basePath, 'dummy.ts');
const fileNames = [fileName];
const originalFileContent = fs.readFileSync(fileName).toString();

const options: ts.CompilerOptions = {};

describe('Test service', function () {
  it('construct', async () => {
    const service = new RehearsalService(options, fileNames);

    assert.exists(service);
    assert.exists(service.getLanguageService());
  });

  it('getFileText', async () => {
    const service = new RehearsalService(options, fileNames);

    expect(function () {
      service.getFileText('oops.ts');
    }).to.throw("Cannot read properties of undefined (reading 'snapshot')");

    assert.equal(service.getFileText(fileName), originalFileContent);
  });

  it('setFileText', async () => {
    const service = new RehearsalService(options, fileNames);

    service.setFileText(fileName, 'class Real {\n  \n}\n');

    assert.equal(service.getFileText(fileName), 'class Real {\n  \n}\n');
  });

  it('setFileText', async () => {
    const service = new RehearsalService(options, fileNames);
    const originalContent = fs.readFileSync(fileName).toString();

    service.setFileText(fileName, 'class Real {\n  \n}\n');

    assert.equal(fs.readFileSync(fileName).toString(), originalFileContent);

    service.saveFile(fileName);

    assert.equal(fs.readFileSync(fileName).toString(), 'class Real {\n  \n}\n');

    fs.writeFileSync(fileName, originalContent);

    assert.equal(fs.readFileSync(fileName).toString(), originalFileContent);
  });

  it('getSourceFile', async () => {
    const service = new RehearsalService(options, fileNames);

    assert.equal(service.getSourceFile('oops'), undefined);

    assert.exists(service.getSourceFile(fileName));
    assert.equal(service.getSourceFile(fileName).text, originalFileContent);
  });

  it('getSemanticDiagnosticsWithLocation', async () => {
    const service = new RehearsalService(options, fileNames);

    let diagnostics: ts.DiagnosticWithLocation[];

    diagnostics = service.getSemanticDiagnosticsWithLocation(fileName);

    assert.equal(diagnostics.length, 0);

    // Add error to the file content
    service.setFileText(fileName, 'class Dummy {\n  \n}\n oops();\n');
    diagnostics = service.getSemanticDiagnosticsWithLocation(fileName);

    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].code, 2304);
    assert.equal(diagnostics[0].messageText, `Cannot find name 'oops'.`);
  });

  it('resolveModuleName', async () => {
    const service = new RehearsalService(options, fileNames);

    const path = service.resolveModuleName('path', fileName);

    assert.equal(path, undefined);
  });
});
