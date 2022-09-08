import { Reporter } from '@rehearsal/reporter';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import type { Logger } from 'winston';
import { createLogger, format, transports } from 'winston';

import { migrate, MigrateInput } from '../src';

describe('migrate', () => {
  let sourceFiles: string[] = [];
  let migratedFiles: string[] = [];
  let basePath: string;
  let expectedDir: string;
  let actualDir: string; // our tmp directory
  let reporter: Reporter;
  let logger: Logger;

  /**
   * Cleans a directory if it exists directory
   */
  function clean(dir: string): void {
    rmSync(dir, { recursive: true, force: true });
  }
  // copy the fixture files to a tmp directory
  function prepareInputFiles(files: string[] = ['index.js']): string[] {
    return files.map((file) => {
      const inputDir = resolve(basePath, 'src', file);
      const dest = resolve(actualDir, file);
      copyFileSync(inputDir, dest);

      return dest;
    });
  }

  beforeEach(() => {
    basePath = resolve(__dirname, 'fixtures', 'migrate');
    expectedDir = resolve(__dirname, 'fixtures', 'migrate', 'output');
    actualDir = resolve(__dirname, 'fixtures', 'migrate', 'tmp');

    clean(actualDir);

    mkdirSync(actualDir);

    sourceFiles = prepareInputFiles(['index.js']);

    logger = createLogger({
      transports: [new transports.Console({ format: format.cli(), level: 'debug' })],
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
    const jsonReport = resolve(basePath, '.rehearsal-report.json');
    reporter.save(jsonReport);
    const report = JSON.parse(readFileSync(jsonReport).toString());

    expect(report.summary.basePath).toMatch(/migrate/);
    expect(migratedFiles).includes(`${actualDir}/index.ts`);
    rmSync(jsonReport);
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

    expect(existsSync(file)).toBeTruthy();

    const actual = readFileSync(file, 'utf-8');
    const expected = readFileSync(`${expectedDir}/index.ts.output`, 'utf-8');
    expect(actual).toBe(expected);
    const jsonReport = resolve(basePath, '.rehearsal-report.json');
    reporter.save(jsonReport);
    const report = JSON.parse(readFileSync(jsonReport).toString());

    expect(report.summary.basePath).toMatch(/migrate/);
    rmSync(jsonReport);
  });

  test('should infer argument type (complex) mixed extensions js and ts', async () => {
    const files = ['complex.js', 'salutations.ts'];
    const sourceFiles = prepareInputFiles(files);

    const input: MigrateInput = {
      basePath: join(basePath, 'tmp'),
      sourceFiles,
      logger,
      reporter,
    };

    const output = await migrate(input);

    migratedFiles = output.migratedFiles;

    const file = migratedFiles.find((file) => file.includes('complex.ts')) || '';

    expect(existsSync(file)).toBeTruthy();

    const actual = readFileSync(file, 'utf-8');
    const expected = readFileSync(`${expectedDir}/complex.ts.output`, 'utf-8');

    expect(actual).toBe(expected);
    const jsonReport = resolve(basePath, '.rehearsal-report.json');
    reporter.save(jsonReport);
    const report = JSON.parse(readFileSync(jsonReport).toString());

    expect(report.summary.basePath).toMatch(/migrate/);
    rmSync(jsonReport);
  });
});
