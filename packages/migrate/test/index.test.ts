import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Report, Reporter } from '@rehearsal/reporter';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createLogger, format, transports } from 'winston';
import findupSync from 'findup-sync';
import { readJSONSync } from 'fs-extra/esm';
import { migrate, MigrateInput } from '../src/index.js';
import type { Logger } from 'winston';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

    reporter = new Reporter(
      {
        tsVersion: '',
        projectName: '@rehearsal/test',
        basePath: actualDir,
        commandName: '@rehearsal/migrate',
      },
      logger
    );
  });

  afterEach(() => {
    clean(actualDir);
  });

  test('should move js file to ts extension', async () => {
    const input: MigrateInput = {
      basePath: actualDir,
      sourceFiles,
      logger,
      reporter,
      entrypoint: 'index.js',
    };

    const output = await migrate(input);
    migratedFiles = output.migratedFiles;
    const jsonReport = resolve(basePath, '.rehearsal-report.json');
    reporter.saveReport(jsonReport);
    const report = JSON.parse(readFileSync(jsonReport).toString()) as Report;

    expect(report.summary[0].basePath).toMatch(/migrate/);
    expect(report.summary[0].entrypoint).toMatch('index.ts');
    expect(migratedFiles).includes(`${actualDir}/index.ts`);
    expect(existsSync(`${actualDir}/index.js`)).toBeFalsy();
    rmSync(jsonReport);
  });

  test('should infer argument type (basic)', async () => {
    const input: MigrateInput = {
      basePath,
      sourceFiles,
      logger,
      reporter,
      entrypoint: '',
    };

    const output = await migrate(input);

    migratedFiles = output.migratedFiles;

    const file = migratedFiles.find((file) => file.includes('index.ts')) || '';

    expect(existsSync(file)).toBeTruthy();

    const actual = readFileSync(file, 'utf-8');
    const expected = readFileSync(`${expectedDir}/index.ts.output`, 'utf-8');
    expect(actual).toBe(expected);
    const jsonReport = resolve(basePath, '.rehearsal-report.json');
    reporter.saveReport(jsonReport);
    const report = JSON.parse(readFileSync(jsonReport).toString()) as Report;

    expect(report.summary[0].basePath).toMatch(/migrate/);
    rmSync(jsonReport);
  });

  test.skip('should infer argument type (complex) mixed extensions js and ts', async () => {
    const files = ['complex.js', 'salutations.ts'];
    const sourceFiles = prepareInputFiles(files);

    const pkgJSONPath = findupSync('package.json', {
      cwd: __dirname,
    }) as string;

    const lockFilePath = findupSync('pnpm-lock.yaml', {
      cwd: __dirname,
    });

    expect(pkgJSONPath).toBeTruthy();
    expect(lockFilePath).toBeTruthy();

    const originalPackageJSON = readFileSync(pkgJSONPath, 'utf-8');
    const originalLockFile = readFileSync(lockFilePath!, 'utf-8');

    const input: MigrateInput = {
      basePath: join(basePath, 'tmp'),
      sourceFiles,
      logger,
      reporter,
      entrypoint: '',
    };

    const output = await migrate(input);

    migratedFiles = output.migratedFiles;

    const file = migratedFiles.find((file) => file.includes('complex.ts')) || '';

    expect(existsSync(file)).toBeTruthy();

    const actual = readFileSync(file, 'utf-8');
    const expected = readFileSync(`${expectedDir}/complex.ts.output`, 'utf-8');

    expect(actual).toBe(expected);
    const jsonReport = resolve(basePath, '.rehearsal-report.json');
    reporter.saveReport(jsonReport);
    const report = JSON.parse(readFileSync(jsonReport).toString()) as Report;

    expect(report.summary[0].basePath).toMatch(/migrate/);
    rmSync(jsonReport);

    const pkgJSON = readJSONSync(pkgJSONPath) as { devDependencies: Record<string, string> };

    expect(pkgJSON.devDependencies['@types/uuid']).toBeTruthy();

    // cleanup
    writeFileSync(pkgJSONPath, originalPackageJSON);
    writeFileSync(lockFilePath!, originalLockFile);
  });
});
