import { RehearsalService } from '@rehearsal/service';
import { Project } from 'fixturify-project';
import { resolve } from 'path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { EmptyLinesPreservePlugin } from '../src';

describe('Test EmptyLinesPreservePlugin', function () {
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
// This is a single line comment

// This is another single line comment
const someTrueVariable = true;

/*
* This is multiline comment
*

  With some empty lines it it
*/
const someFalseVariable = false;



/**
 * This is a JSDoc comment
 *

* With some empty lines it it
*/
function someFunction(): void {

  return ;
}
    `;

    project.write();

    const files = Object.keys(project.files).map((file) => resolve(project.baseDir, file));
    const service = new RehearsalService({ baseUrl: project.baseDir }, files);

    const plugin = new EmptyLinesPreservePlugin(service);

    for (const fileName of files) {
      const result = await plugin.run({ fileName });
      const resultText = service.getFileText(fileName).trim();

      expect(result).toHaveLength(1);
      expect(resultText).toMatchSnapshot();
    }
  });
});
