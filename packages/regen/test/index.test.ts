import { resolve } from 'path';
import { copyFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { Reporter } from '@rehearsal/reporter';
import { describe, test, beforeEach, afterEach, expect } from 'vitest';
import { outputFileSync } from 'fs-extra';
import { regen, RegenInput } from '../src';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const basePath = resolve(__dirname);
const expectedDir = resolve(basePath, 'fixtures', 'output');
const srcDir = resolve(basePath, 'fixtures', 'src');
const generatedDir = resolve(basePath, 'tmp');
const jsonReportPath = resolve(generatedDir, '.rehearsal-report.json');

let reporter: Reporter;
let regenInput: RegenInput;

describe('regen', () => {
  beforeEach(() => {
    cleanDir(generatedDir);
    mkdirSync(generatedDir);

    reporter = new Reporter({
      tsVersion: '',
      projectName: '@rehearsal/test',
      basePath,
      commandName: '@rehearsal/migrate',
    });

    regenInput = {
      basePath: resolve(basePath, 'tmp'),
      sourceFiles: [],
      reporter,
      entrypoint: '',
    };
  });

  afterEach(() => {
    cleanDir(generatedDir);
  });

  test('should scan files and generate report', async () => {
    prepareInputFiles(['test1.ts']);

    const { scannedFiles } = await regen(regenInput);
    expect(scannedFiles.length).toBe(1);

    reporter.saveReport(jsonReportPath);
    expect(existsSync(jsonReportPath)).toBeTruthy();
  });

  test('should scan ts files but ignore js files', async () => {
    prepareInputFiles(['test1.ts', 'test2.js']);

    const { scannedFiles } = await regen(regenInput);
    expect(scannedFiles.length).toBe(1);
    expect(scannedFiles[0].includes('test1.ts')).toBeTruthy();

    reporter.saveReport(jsonReportPath);
    const report = JSON.parse(readFileSync(jsonReportPath).toString());
    const { items } = report;
    expect(JSON.stringify(items, null, 2)).toMatchSnapshot();

    expect(fileOutputMatched('test1.ts')).toBeTruthy();
  });

  test('should generate correct rehearsal comments for a group of files', async () => {
    prepareInputFiles(['test1.ts', 'test3.ts']);

    const { scannedFiles } = await regen(regenInput);
    expect(scannedFiles.length).toBe(2);

    reporter.saveReport(jsonReportPath);

    const report = JSON.parse(readFileSync(jsonReportPath).toString());
    const { items } = report;
    expect(JSON.stringify(items, null, 2)).toMatchSnapshot();

    expect(fileOutputMatched('test3.ts')).toBeTruthy();
    expect(fileOutputMatched('test1.ts')).toBeTruthy();
  });

  test('should report lint errors', async () => {
    prepareInputFiles(['test4.ts']);

    const { scannedFiles } = await regen(regenInput);
    expect(scannedFiles.length).toBe(1);
    reporter.saveReport(jsonReportPath);

    const report = JSON.parse(readFileSync(jsonReportPath).toString());
    const { items } = report;
    expect(JSON.stringify(items, null, 2)).toMatchSnapshot();

    expect(fileOutputMatched('test4.ts')).toBeTruthy();
  });
});

function fileOutputMatched(filename: string): boolean {
  const generatedFile = resolve(generatedDir, filename);
  const generatedContent = readFileSync(generatedFile, 'utf-8');
  const expectedContent = readFileSync(`${expectedDir}/${filename}.output`, 'utf-8');
  return generatedContent === expectedContent;
}

function prepareInputFiles(srcFiles: string[]): string[] {
  createTSConfig(generatedDir);
  return srcFiles.map((file) => {
    const originalPath = resolve(srcDir, file);
    const generatedPath = resolve(generatedDir, file);
    copyFileSync(originalPath, generatedPath);
    return generatedPath;
  });
}

function createTSConfig(dir: string): void {
  const configStr = `{
    "extends": "../tsconfig",
    "include": ["."]
  }
  `;
  const configPath = resolve(dir, 'tsconfig.json');
  outputFileSync(configPath, configStr);
}

function cleanDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}
