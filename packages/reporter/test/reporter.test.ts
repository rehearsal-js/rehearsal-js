import fs from 'fs';

import { assert } from 'chai';
import { describe, it } from 'mocha';
import { resolve } from 'path';

import { Reporter, Report } from '../src';

const basePath = resolve(__dirname, 'fixtures');

describe('Test reporter', function () {
  it('load', async () => {
    const reporter = new Reporter('test', basePath).load(
      resolve(basePath, '.rehearsal-report.input.json')
    );

    const report = (reporter as any).report as Report;

    assert.isNotEmpty(report.summary.basePath);
    assert.isNotEmpty(report.summary.timestamp);
    assert.deepEqual(report, expectedReport(basePath, '.rehearsal-report.output.json'));
  });

  it('save', async () => {
    // TODO: Implement test case
  });

  it('print, json', async () => {
    // TODO: Implement test case
  });

  it('print, pull-request-md', async () => {
    // TODO: Implement test case
  });

  it('addItem', async () => {
    // TODO: Implement test case
  });

  it('getFileNames', async () => {
    const reporter = new Reporter('test', basePath).load(
      resolve(basePath, '.rehearsal-report.input.json')
    );

    assert.deepEqual(reporter.getFileNames(), ['first.ts', 'second.ts']);
  });

  it('getItemsByFile', async () => {
    const reporter = new Reporter('test', basePath).load(
      resolve(basePath, '.rehearsal-report.input.json')
    );

    assert.deepEqual(reporter.getItemsByAnalysisTarget('first.ts'), [
      {
        category: 'Error',
        fixedFiles: [
          {
            fileName: 'first.ts',
            location: {
              line: 0,
              character: 0,
            },
          },
        ],
        commentedFiles: [],
        code: 6133,
        analysisTarget: 'first.ts',
        fixed: true,
        hint: "The declaration 'fs' is never read or used. Remove the declaration or use it.",
        nodeLocation: {
          character: 0,
          length: 20,
          line: 0,
          start: 0,
        },
        message: "'fs' is declared but its value is never read.",
        nodeKind: 'ImportDeclaration',
        nodeText: "import fs from 'fs';",
      },
    ]);

    assert.deepEqual(reporter.getItemsByAnalysisTarget('second.ts'), [
      {
        category: 'Error',
        fixedFiles: [
          {
            fileName: 'second.ts',
            location: {
              line: 0,
              character: 0,
            },
          },
        ],
        commentedFiles: [],
        code: 6133,
        analysisTarget: 'second.ts',
        fixed: true,
        hint: "The declaration 'parse' is never read or used. Remove the declaration or use it.",
        nodeLocation: {
          character: 18,
          length: 5,
          line: 0,
          start: 18,
        },
        message: "'parse' is declared but its value is never read.",
        nodeKind: 'ImportSpecifier',
        nodeText: 'parse',
      },
    ]);
  });
});

/**
 * Prepares the report to compare with.
 */
function expectedReport(basePath: string, fileName: string): Report {
  const content = fs.readFileSync(resolve(basePath, fileName)).toString();

  return JSON.parse(content) as Report;
}
