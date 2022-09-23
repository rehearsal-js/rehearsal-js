import { type Report, type ReportItem, Reporter } from '@rehearsal/reporter';
import { copyFileSync, readdirSync, readFileSync, rmSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, test } from 'vitest';
import { createLogger, format, transports } from 'winston';

import { upgrade } from '../src';

describe('Test upgrade', async function () {
  const basePath = resolve(__dirname, 'fixtures', 'upgrade');

  const files = prepareListOfTestFiles(basePath);

  const logger = createLogger({
    transports: [new transports.Console({ format: format.cli(), level: 'debug' })],
  });

  const reporter = new Reporter('@rehearsal/test', basePath, logger);

  createTsFilesFromInputs(files);

  const result = await upgrade({ basePath, logger, reporter });

  test('should fix errors or provide hints for errors in the original files', () => {
    expect(result).toBeDefined();

    for (const file of files) {
      const input = readFileSync(file).toString();
      const output = readFileSync(`${file}.output`).toString();

      expect(input).toEqual(output);
    }

    cleanupTsFiles(files);
  });

  test('should output the correct data from upgrade', () => {
    const report = (reporter as any).report as Report;

    report.summary.timestamp = '9/22/2022, 13:48:38';
    report.summary.basePath = '';
    report.items.forEach((item) => {
      removeAllBasePaths(item, basePath);
    });

    expect(report).toMatchSnapshot();
  });
});

/**
 * Prepare ts files in the folder by using sources from .input
 */
function prepareListOfTestFiles(basePath: string): string[] {
  return readdirSync(basePath) // Takes all files from fixtures/upgrade
    .filter((file) => file.endsWith('.input')) // Filter only .input ones
    .map((file) => file.slice(0, -6)) // Remove .input suffix from filenames
    .map((file) => resolve(basePath, file)); //  Append basePath to file names
}

/**
 * Creates .ts files from .ts.input files
 */
function createTsFilesFromInputs(files: string[]): void {
  files.forEach((file) => {
    copyFileSync(`${file}.input`, `${file}`);
  });
}

/**
 * Removes .ts files after test is completed
 */
function cleanupTsFiles(files: string[]): void {
  for (const file of files) {
    rmSync(file);
  }
}

function removeAllBasePaths(item: ReportItem, basePath: string): void {
  item.analysisTarget = removeBasePath(item.analysisTarget, basePath);
  if (item.files) {
    for (const fileKey in item.files) {
      item.files[fileKey].fileName = removeBasePath(item.files[fileKey].fileName, basePath);

      const newFileKey = removeBasePath(fileKey, basePath);
      item.files[newFileKey] = item.files[fileKey];
      delete item.files[fileKey];
    }
  }
}

function removeBasePath(file: string, basePath: string): string {
  return file.replace(`${basePath}/`, '');
}
