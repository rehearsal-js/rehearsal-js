import { assert } from 'chai';
import { describe } from 'mocha';
import { resolve } from 'path';
import fs from 'fs';

import diagnose from '../src/diagnose';

const basePath = resolve(__dirname, 'fixtures/app');
const filesNames = ['first.ts', 'second.ts'];

// Append basePath to file names
const files = filesNames.map((file) => resolve(basePath, file));

beforeEach(() => {
  createTsFilesFromInputs(files);
});

describe('Test diagnose', function () {
  it(`run`, async () => {
    const result = await diagnose(basePath);

    assert.equal(result, true);

    // Compare each updated .ts file with expected .ts.output
    files.forEach((file) => {
      assert.equal(fs.readFileSync(`${file}.output`).toString(), fs.readFileSync(file).toString());
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
