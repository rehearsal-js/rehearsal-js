import { RehearsalService } from '@rehearsal/service';
import { Project } from 'fixturify-project';
import { resolve } from 'path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { ReRehearsePlugin } from '../src';

describe('Test ReRehearsalPlugin', function () {
  let project: Project;

  beforeEach(() => {
    project = new Project('foo', '0.0.0');
    delete project.files['index.js'];
  });

  afterEach(() => {
    project.dispose();
  });

  test('run', async () => {
    project.files['index.ts'] = `
/**
 * This is a file with some comments added in a previous run of rehearsal
 */
import fs from 'fs';

/* @rehearsal TODO TS6133: This message should be updated... */
function unusedFunction(): boolean {
  return fs.existsSync('.')
}

/* @rehearsal TODO TS007: This comment should be kept, plus another comment needs to be added 6133. */
let unusedVariable: number;

/* This is just a second comment that should not be touch */
/* @rehearsal TODO TS6133: The variable 'unusedConst' is never read or used. Remove the variable or use it. */
const unusedConst1 = null;

/* @rehearsal TODO TS6133: Comment. */ fs.existsSync('.');
const unusedConst2 = null;

fs.existsSync('.'); /* @rehearsal TODO TS6133: Comment. */
const unusedConst3 = null;


fs.existsSync('@rehearsal')
const unusedConstWithoutCommentButWithRehearsalTagAbove = null;

const resultValue = something
    ? /* @rehearsal TODO TS2304: Cannot find name 'missingVar'. */
      missingVar
    : /* @rehearsal TODO TS2304: Cannot find name 'missingVarAsWellButThisTimeWeUseVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryLongString'. */
      missingVarAsWellButThisTimeWeUseVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryLongString;
    `;

    project.write();
    const fileNames = Object.keys(project.files).map((file) => resolve(project.baseDir, file));

    const service = new RehearsalService({ baseUrl: project.baseDir }, fileNames);

    const plugin = new ReRehearsePlugin(service);

    for (const fileName of fileNames) {
      const result = await plugin.run(fileName);
      const resultText = service.getFileText(fileName).trim();

      expect(result).toHaveLength(1);
      expect(resultText).toMatchSnapshot();
    }
  });
});
