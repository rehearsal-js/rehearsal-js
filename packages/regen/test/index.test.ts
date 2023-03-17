import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { Report, Reporter } from '@rehearsal/reporter';
import { describe, test, beforeEach, afterEach, expect } from 'vitest';
import { regen, RegenInput } from '../src/index.js';
import { Project } from 'fixturify-project';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const basePath = resolve(__dirname);
const srcDir = resolve(basePath, 'fixtures', 'src');

let reporter: Reporter;
let regenInput: RegenInput;
let project: Project;

describe('regen', () => {
  beforeEach(async () => {
    reporter = new Reporter({
      tsVersion: '',
      projectName: '@rehearsal/test',
      basePath,
      commandName: '@rehearsal/migrate',
    });

    project = createProject();

    regenInput = {
      basePath: project.baseDir,
      sourceFiles: [],
      reporter,
      entrypoint: '',
      eslintOptions: { cwd: project.baseDir },
    };

    await project.write();
  });

  afterEach(() => {
    project.dispose();
  });

  test('should scan files and generate report', async () => {
    const { scannedFiles } = await regen(regenInput);
    expect(scannedFiles.length).toBe(3);

    const jsonReportPath = join(project.baseDir, '.rehearsal-report.json');

    reporter.saveReport(jsonReportPath);

    expect(existsSync(jsonReportPath)).toBeTruthy();
    const report = cleanReport(JSON.parse(readFileSync(jsonReportPath, 'utf-8')));
    const { items } = report;
    expect(JSON.stringify(items, null, 2)).toMatchSnapshot();

    expect(fileOutputMatched('test1.ts')).toBeTruthy();
    expect(fileOutputMatched('test2.js')).toBeTruthy();
    expect(fileOutputMatched('test3.ts')).toBeTruthy();
    expect(fileOutputMatched('test4.ts')).toBeTruthy();
  });
});

function fileOutputMatched(filename: string): boolean {
  const outputFile = resolve(project.baseDir, filename);
  const outputFileContent = readFileSync(outputFile, 'utf-8');
  return outputFileContent === project.files[filename];
}

function cleanReport(report: Report): Report {
  report.summary.forEach((sum) => (sum.basePath = `<path>/${basename(sum.basePath)}`));
  report.items.forEach((item) => (item.analysisTarget = `<path>/${basename(item.analysisTarget)}`));
  return report;
}

function createProject(): Project {
  const project = Project.fromDir(srcDir, { linkDeps: true, linkDevDeps: true });

  project.files['tsconfig.json'] = JSON.stringify(
    {
      include: ['.'],
      compilerOptions: {
        allowSyntheticDefaultImports: true,
        declarationMap: true,
        newLine: 'LF',
        noUnusedLocals: true,
        noUnusedParameters: true,
        strictNullChecks: true,
        resolveJsonModule: true,
        skipDefaultLibCheck: true,
        skipLibCheck: true,
        target: 'ES2020',
        module: 'Node16',
        moduleResolution: 'Node16',
        strict: true,
        noImplicitOverride: true,
        noPropertyAccessFromIndexSignature: true,
        esModuleInterop: false,
        composite: true,
        declaration: true,
        sourceMap: true,
      },
    },
    null,
    2
  );
  project.files['.eslintrc.json'] = readFileSync(join(basePath, '.eslintrc.json'), 'utf-8');

  return project;
}
