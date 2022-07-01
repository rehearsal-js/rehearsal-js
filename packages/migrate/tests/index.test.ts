import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import winston from 'winston';
import Reporter from '@rehearsal/reporter';
import fs from 'fs';
import migrate, { MigrateInput } from '../src/migrate';

describe('renameFile', () => {
  let sourceFiles: Array<string> = [];
  let convertedFiles: Array<string> = [];
  let basePath: string;
  let expectedDir: string;
  let actualDir: string; // our tmp directory
  let reporter: Reporter;
  let logger: winston.Logger;

  /**
   * Cleans a directory if it exists directory
   */
  function clean(dir: string): void {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  function prepareInputFiles(files: Array<string> = ['index.js']): Array<string> {
    return files.map((file) => {
      const inputDir = path.resolve(basePath, 'src', file);
      const dest = path.resolve(actualDir, file);
      fs.copyFileSync(inputDir, dest);
      return dest;
    });
  }

  beforeEach(() => {
    basePath = path.resolve(__dirname, 'fixtures', 'convert');
    expectedDir = path.resolve(__dirname, 'fixtures', 'convert', 'output');
    actualDir = path.resolve(__dirname, 'fixtures', 'convert', 'tmp');

    clean(actualDir);

    fs.mkdirSync(actualDir);

    sourceFiles = prepareInputFiles(['index.js']);

    logger = winston.createLogger({
      transports: [
        new winston.transports.Console({ format: winston.format.cli(), level: 'debug' }),
      ],
    });
    reporter = new Reporter('@rehearsal/test', basePath, logger);
  });

  afterEach(() => {
    clean(actualDir);
  });

  test('should rename file to ts extension', async () => {
    const input: MigrateInput = {
      basePath,
      sourceFiles,
      logger,
      reporter,
    };

    const output = await migrate(input);
    convertedFiles = output.convertedFiles;
    // console.log(convertedFiles);
    expect(convertedFiles).includes(`${actualDir}/index.ts`);
  });

  test('should infer argument type (basic)', async () => {
    const input: MigrateInput = {
      basePath,
      sourceFiles,
      logger,
      reporter,
    };

    const output = await migrate(input);

    convertedFiles = output.convertedFiles;

    const file = convertedFiles.find((file) => file.includes('index.ts')) || '';

    expect(fs.existsSync(file)).toBeTruthy();

    const actual: string = fs.readFileSync(file, 'utf-8');
    console.log(`${expectedDir}/index.ts.output`);
    const expected = fs.readFileSync(`${expectedDir}/index.ts.output`, 'utf-8');
    expect(actual).toBe(expected);
  });

  test.skip('should infer argument type (complex)', async () => {
    // const files = ['complex.js', 'some-util.js', 'some-util.d.ts'];
    const files = ['complex.js', 'some-util.js', 'some-util.d.ts'];
    const sourceFiles = prepareInputFiles(files);
    // console.log(sourceFiles);
    const input: MigrateInput = {
      basePath: path.join(basePath, 'tmp'),
      sourceFiles,
      logger,
      reporter,
    };

    const output = await migrate(input);

    convertedFiles = output.convertedFiles;

    const file = convertedFiles.find((file) => file.includes('complex.ts')) || '';

    expect(fs.existsSync(file)).toBeTruthy();

    const actual: string = fs.readFileSync(file, 'utf-8');
    console.log(`${expectedDir}/index.ts.output`);
    const expected = fs.readFileSync(`${expectedDir}/index.ts.output`, 'utf-8');
    expect(actual).toBe(expected);
  });
});
