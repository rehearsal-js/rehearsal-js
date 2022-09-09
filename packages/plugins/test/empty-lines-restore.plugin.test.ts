import { RehearsalService } from '@rehearsal/service';
import { Project } from 'fixturify-project';
import { resolve } from 'path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { EmptyLinesRestorePlugin } from '../src';

describe('Test EmptyLinesRestorePlugin', function () {
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
//:line:
// This is another single line comment
  const someTrueVariable = true;
//:line:
/*
  * This is multiline comment
  *
    //:line:
    With some empty lines it it
  */
const someFalseVariable = false;
//:line:
//:line:
//:line:
/**
 * This is a JSDoc comment
 *
//:line:
  * With some empty lines it it
  */
function someFunction(): void {
  //:line:
  return ;
}
    `;
    project.write();

    const fileNames = Object.keys(project.files).map((file) => resolve(project.baseDir, file));

    const service = new RehearsalService({ baseUrl: project.baseDir }, fileNames);

    const plugin = new EmptyLinesRestorePlugin(service);

    for (const fileName of fileNames) {
      const result = await plugin.run({ fileName });
      const resultText = service.getFileText(fileName).trim();

      expect(result).toHaveLength(1);
      expect(resultText).toMatchSnapshot();
    }
  });
});
