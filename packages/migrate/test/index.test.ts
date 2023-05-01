import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Report, Reporter } from '@rehearsal/reporter';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import findupSync from 'findup-sync';
import { readJSONSync } from 'fs-extra/esm';
import { Project } from 'fixturify-project';
import { migrate, MigrateInput } from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('migrate', () => {
  let sourceFiles: string[] = [];
  let reporter: Reporter;
  let project: Project;

  beforeEach(async () => {
    const basePath = resolve(__dirname, 'fixtures', 'migrate', 'src');
    project = Project.fromDir(basePath, { linkDeps: true, linkDevDeps: true });

    sourceFiles = [join(project.baseDir, 'index.js')];

    reporter = new Reporter({
      tsVersion: '',
      projectName: '@rehearsal/test',
      basePath: project.baseDir,
      commandName: '@rehearsal/migrate',
    });

    await project.write();
  });

  afterEach(() => {
    project.dispose();
  });

  test('should move js file to ts extension', async () => {
    const input: MigrateInput = {
      basePath: project.baseDir,
      sourceFiles,
      reporter,
    };

    const migratedFiles = [];

    for await (const f of migrate(input)) {
      if (f) {
        migratedFiles.push(f);
      }
    }
    const jsonReport = resolve(project.baseDir, 'rehearsal-report.json');
    reporter.printReport(project.baseDir);
    const report = JSON.parse(readFileSync(jsonReport).toString()) as Report;

    expect(report.summary[0].basePath).toMatch(project.baseDir);
    expect(report.summary[0].entrypoint).toMatch('index.ts');
    expect(migratedFiles).includes(`${project.baseDir}/index.ts`);
    expect(existsSync(`${project.baseDir}/index.js`)).toBeFalsy();
    rmSync(jsonReport);
  });

  test('should infer argument type (basic)', async () => {
    const input: MigrateInput = {
      basePath: project.baseDir,
      sourceFiles,
      reporter,
    };

    const migratedFiles = [];

    for await (const f of migrate(input)) {
      if (f) {
        migratedFiles.push(f);
      }
    }

    const file = migratedFiles.find((file) => file.includes('index.ts')) || '';

    expect(existsSync(file)).toBeTruthy();

    const actual = readFileSync(file, 'utf-8');
    const expected = readFileSync(`${project.baseDir}/index.ts`, 'utf-8');
    expect(actual).toBe(expected);
    const jsonReport = resolve(project.baseDir, 'rehearsal-report.json');
    reporter.printReport(project.baseDir);
    const report = JSON.parse(readFileSync(jsonReport).toString()) as Report;

    expect(report.summary[0].basePath).toMatch(project.baseDir);
    rmSync(jsonReport);
  });

  test.skip('should infer argument type (complex) mixed extensions js and ts', async () => {
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
      basePath: project.baseDir,
      sourceFiles,
      reporter,
    };

    const migratedFiles = [];

    for await (const f of migrate(input)) {
      if (f) {
        migratedFiles.push(f);
      }
    }

    const file = migratedFiles.find((file) => file.includes('complex.ts')) || '';

    expect(existsSync(file)).toBeTruthy();

    const jsonReport = resolve(project.baseDir, 'rehearsal-report.json');
    reporter.printReport(project.baseDir);
    const report = JSON.parse(readFileSync(jsonReport).toString()) as Report;

    expect(report.summary[0].basePath).toMatch(project.baseDir);
    rmSync(jsonReport);

    const pkgJSON = readJSONSync(pkgJSONPath) as { devDependencies: Record<string, string> };

    expect(pkgJSON.devDependencies['@types/uuid']).toBeTruthy();

    // cleanup
    writeFileSync(pkgJSONPath, originalPackageJSON);
    writeFileSync(lockFilePath!, originalLockFile);
  });
});
