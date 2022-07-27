import fs from 'fs';

import { assert } from 'chai';
import { describe } from 'mocha';
import { resolve } from 'path';

import { diagnose } from '../src';

const basePath = resolve(__dirname, 'fixtures', 'diagnose');
const fileNames = ['first.ts', 'react.tsx', 'second.ts'];

// Append basePath to file names
const files = fileNames.map((file) => resolve(basePath, file));

describe('Test diagnose', function () {
  it(`run`, async () => {
    createTsFilesFromInputs(files);

    const result = await diagnose({ basePath });

    assert.deepEqual(result, {
      basePath,
      configFile: resolve(basePath, 'tsconfig.json'),
      reportFile: resolve(basePath, '.rehearsal-diagnostics.json'),
      sourceFiles: files,
      sourceFilesModified: true,
    });

    // Compare each updated .ts file with expected .ts.output
    for (const file of files) {
      assert.equal(fs.readFileSync(`${file}.output`).toString(), fs.readFileSync(file).toString());
    }

    cleanupTsFiles(files);

    // Compare generated report file
    assert.equal(
      fs.readFileSync(resolve(basePath, '.rehearsal-diagnostics.json')).toString(),
      fs.readFileSync(resolve(basePath, '.rehearsal-diagnostics.json.output')).toString().trim()
    );

    fs.rmSync(resolve(basePath, '.rehearsal-diagnostics.json'));
  });

  it(`run without file modification`, async () => {
    createTsFilesFromInputs(files);

    const result = await diagnose({
      basePath,
      reportName: '.rehearsal-diagnostics-only.json',
      modifySourceFiles: false,
    });

    assert.deepEqual(result, {
      basePath,
      configFile: resolve(basePath, 'tsconfig.json'),
      reportFile: resolve(basePath, '.rehearsal-diagnostics-only.json'),
      sourceFiles: files,
      sourceFilesModified: false,
    });

    // Compare each updated .ts file with expected original .ts.input
    for (const file of files) {
      assert.equal(fs.readFileSync(`${file}.input`).toString(), fs.readFileSync(file).toString());
    }

    cleanupTsFiles(files);

    // Compare generated report file
    assert.equal(
      fs.readFileSync(resolve(basePath, '.rehearsal-diagnostics-only.json')).toString(),
      fs
        .readFileSync(resolve(basePath, '.rehearsal-diagnostics-only.json.output'))
        .toString()
        .trim()
    );

    fs.rmSync(resolve(basePath, '.rehearsal-diagnostics-only.json'));
  });

  it(`run with a wrong base directory `, async () => {
    await diagnose({ basePath: '/' }).catch((reason) => {
      assert.equal(`Error: Config file 'tsconfig.json' not found in '/'`, reason.toString());
    });
  });
});

/**
 * Creates .ts files from .ts.input files
 */
function createTsFilesFromInputs(files: string[]): void {
  files.forEach((file) => {
    fs.copyFileSync(`${file}.input`, `${file}`);
  });
}

/**
 * Removes .ts files after test is competed
 */
function cleanupTsFiles(files: string[]): void {
  for (const file of files) {
    fs.rmSync(file);
  }
}
