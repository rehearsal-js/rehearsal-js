import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import winston from 'winston';
import { Reporter } from '@rehearsal/reporter';
import fs from 'fs';
import { migrate,  MigrateInput } from '../src/migrate';

describe('migrate', () => {
  let sourceFiles: Array<string> = [];
  let migratedFiles: Array<string> = [];
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
    basePath = path.resolve(__dirname, 'fixtures', 'migrate');
    expectedDir = path.resolve(__dirname, 'fixtures', 'migrate', 'output');
    actualDir = path.resolve(__dirname, 'fixtures', 'migrate', 'tmp');

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
    migratedFiles = output.migratedFiles;
    expect(migratedFiles).includes(`${actualDir}/index.ts`);
  });

  test('should infer argument type (basic)', async () => {
    const input: MigrateInput = {
      basePath,
      sourceFiles,
      logger,
      reporter,
    };

    const output = await migrate(input);

    migratedFiles = output.migratedFiles;

    const file = migratedFiles.find((file) => file.includes('index.ts')) || '';

    expect(fs.existsSync(file)).toBeTruthy();

    const actual: string = fs.readFileSync(file, 'utf-8');
    const expected = fs.readFileSync(`${expectedDir}/index.ts.output`, 'utf-8');
    expect(actual).toBe(expected);
  });

  test('should infer argument type (complex)', async () => {
    const files = ['complex.js', 'salutations.ts'];
    const sourceFiles = prepareInputFiles(files);

    const input: MigrateInput = {
      basePath: path.join(basePath, 'tmp'),
      sourceFiles,
      logger,
      reporter,
    };

    const output = await migrate(input);

    migratedFiles = output.migratedFiles;

    const file = migratedFiles.find((file) => file.includes('complex.ts')) || '';

    expect(fs.existsSync(file)).toBeTruthy();

    const actual: string = fs.readFileSync(file, 'utf-8');
    const expected = fs.readFileSync(`${expectedDir}/complex.ts.output`, 'utf-8');
    expect(actual).toBe(expected);
  });
});
