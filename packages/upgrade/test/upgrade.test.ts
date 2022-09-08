import { mdFormatter, Report, Reporter, sarifFormatter } from '@rehearsal/reporter';
import { copyFileSync, readdirSync, readFileSync, rmSync } from 'fs';
import { resolve } from 'path';
import { type Location } from 'sarif';
import { version } from 'typescript';
import { assert, describe, expect, test } from 'vitest';
import { createLogger, format, transports } from 'winston';

import { upgrade } from '../src';

describe('Test upgrade', function () {
  const basePath = resolve(__dirname, 'fixtures', 'upgrade');

  const files = prepareListOfTestFiles(basePath);

  const logger = createLogger({
    transports: [new transports.Console({ format: format.cli(), level: 'debug' })],
  });

  const reporter = new Reporter('@rehearsal/test', basePath, logger);

  test('run', async () => {
    createTsFilesFromInputs(files);

    const result = await upgrade({ basePath, logger, reporter });

    expect(result).toBeDefined();

    // Compare each updated .ts file with expected .ts.output
    for (const file of files) {
      const input = readFileSync(file).toString();
      const output = readFileSync(`${file}.output`).toString();

      expect(input).toEqual(output);
    }

    // TODO: Move to @rehearsal/report
    // Test the json report
    const jsonReport = resolve(basePath, '.rehearsal-report.json');
    reporter.save(jsonReport);

    const report = JSON.parse(readFileSync(jsonReport).toString());

    expect(report.summary.basePath).toMatch(/upgrade/);
    expect(report.summary.timestamp).toMatch(/\d+/);
    assert.deepEqual(report, expectedReport(report.summary.basePath, report.summary.timestamp));

    rmSync(jsonReport);

    // Test the pull-request-md report
    const mdReport = resolve(basePath, '.rehearsal-report.md');
    reporter.print(mdReport, mdFormatter);

    expect(readFileSync(mdReport).toString()).toEqual(
      readFileSync(resolve(basePath, '.rehearsal-report.output.md')).toString()
    );

    rmSync(mdReport);

    const sarifReport = resolve(basePath, '.rehearsal-report.sarif');
    reporter.print(sarifReport, sarifFormatter);

    const sarif = JSON.parse(readFileSync(sarifReport).toString());
    assert.deepEqual(sarif, expectedSarif(basePath, report.summary.timestamp));

    rmSync(sarifReport);

    cleanupTsFiles(files);
  });
});

/**
 * Prepares the report to compare with.
 */
function expectedReport(basePath: string, timestamp: string): Report {
  const content = readFileSync(resolve(basePath, '.rehearsal-report.output.json')).toString();

  const report = JSON.parse(content) as Report;

  report.summary.basePath = basePath;
  report.summary.timestamp = timestamp;
  report.summary.tsVersion = version;
  report.items.forEach((item) => {
    item.analysisTarget = resolve(basePath, item.analysisTarget);
    if (item.files) {
      for (const fileKey in item.files) {
        item.files[fileKey].fileName = resolve(basePath, item.files[fileKey].fileName);

        const newFileKey = resolve(basePath, fileKey);
        item.files[newFileKey] = item.files[fileKey];
        delete item.files[fileKey];
      }
    }
  });

  return report;
}

function expectedSarif(basePath: string, dateToLocaleString: string): string {
  const content = readFileSync(resolve(basePath, '.rehearsal-report.output.sarif')).toString();
  const log = JSON.parse(content);

  const run = log.runs[0];
  const { artifacts, results, automationDetails } = run;

  for (const artifact of artifacts) {
    artifact.location.uri = resolve(basePath, artifact.location.uri);
  }

  for (const result of results) {
    const { analysisTarget, locations, properties } = result;
    analysisTarget.uri = resolve(basePath, analysisTarget.uri);

    if (locations.length > 0) {
      locations.forEach((location: Location) => {
        location.physicalLocation!.artifactLocation!.uri = resolve(
          basePath,
          location!.physicalLocation!.artifactLocation!.uri!
        );
      });
    }

    if (properties.fixes.length > 0) {
      properties.fixes.forEach((fix: { fileName: string; code: string; codeFixAction: string }) => {
        fix.fileName = resolve(basePath, fix.fileName);
      });
    }
  }
  automationDetails.description.text =
    'This is the run of @rehearsal/upgrade on your product against TypeScript 4.7.4 at ' +
    dateToLocaleString;
  return log;
}

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
