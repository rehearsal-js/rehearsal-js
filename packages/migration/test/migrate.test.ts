import fs from 'fs';
import winston from 'winston';

import { resolve } from 'path';

import migrate from '../src/migrate';

import PipeTransform from '../src/interfaces/pipe-transform';

import { lint } from '../src/plugins/lint';
import { preserveEmptyLines, restoreEmptyLines } from '../src/plugins/empty-lines';

import { assert } from 'chai';
import { describe, it } from 'mocha';

const basePath = resolve(__dirname, 'fixtures', 'migrate');
const filesNames = ['first.ts', 'react.tsx', 'second.ts'];

// Append basePath to file names
const files = filesNames.map((file) => resolve(basePath, file));

const logger = winston.createLogger({
  transports: [new winston.transports.Console({ format: winston.format.cli() })],
});

describe('Test migration', function () {
  it('run with correct params', async () => {
    createTsFilesFromInputs(files);

    const pipesBefore: PipeTransform[] = [lint, preserveEmptyLines];
    const pipesAfter: PipeTransform[] = [restoreEmptyLines, lint];

    const result = await migrate({ basePath, logger, pipesBefore, pipesAfter });

    assert.exists(result);

    // Compare each updated .ts file with expected .ts.output
    for (const file of files) {
      assert.equal(fs.readFileSync(`${file}.output`).toString(), fs.readFileSync(file).toString());
    }

    cleanupTsFiles(files);
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
