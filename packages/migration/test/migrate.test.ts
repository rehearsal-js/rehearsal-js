import fs from 'fs';
import ts from 'typescript';
import winston from 'winston';

import { assert } from 'chai';
import { describe, it } from 'mocha';
import { resolve } from 'path';

import migrate from '../src/migrate';

import { Report } from '../src/reporter/types';
import Reporter from '../src/reporter/reporter';
import pullRequestMd from '../src/reporter/formatters/pull-request-md';

const basePath = resolve(__dirname, 'fixtures', 'migrate');
const filesNames = ['first.ts', 'react.tsx', 'second.ts'];

// Append basePath to file names
const files = filesNames.map((file) => resolve(basePath, file));

const logger = winston.createLogger({
  transports: [new winston.transports.Console({ format: winston.format.cli(), level: 'debug' })],
});

const reporter = new Reporter('@rehearsal/test', basePath, logger);

describe('Test migration', function () {
  it('run with correct params', async () => {
    createTsFilesFromInputs(files);

    const result = await migrate({ basePath, logger, reporter });

    assert.exists(result);

    // Compare each updated .ts file with expected .ts.output
    for (const file of files) {
      assert.equal(fs.readFileSync(`${file}.output`).toString(), fs.readFileSync(file).toString());
    }

    // Test the json report
    assert.isTrue(fs.existsSync(result.reportFile));

    const report = JSON.parse(fs.readFileSync(result.reportFile).toString());

    assert.isNotEmpty(report.summary.basePath);
    assert.isNotEmpty(report.summary.timestamp);
    assert.deepEqual(report, expectedReport(report.summary.basePath, report.summary.timestamp));

    fs.rmSync(result.reportFile);

    // Test the pull-request-md report
    // TODO: Move to @rehearsal/report
    const mdReport = resolve(basePath, '.rehearsal-report.md');
    reporter.print(mdReport, pullRequestMd);

    assert.equal(
      fs.readFileSync(resolve(basePath, '.rehearsal-report.output.md')).toString(),
      fs.readFileSync(mdReport).toString()
    );

    fs.rmSync(mdReport);

    cleanupTsFiles(files);
  });
});

/**
 * Prepares the report to compare with.
 */
function expectedReport(basePath: string, timestamp: string): Report {
  const content = fs.readFileSync(resolve(basePath, '.rehearsal-report.output.json')).toString();

  const report = JSON.parse(content) as Report;

  report.summary.basePath = basePath;
  report.summary.timestamp = timestamp;
  report.summary.tsVersion = ts.version;
  report.items.map((v) => (v.file = resolve(basePath, v.file)));

  return report;
}

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
