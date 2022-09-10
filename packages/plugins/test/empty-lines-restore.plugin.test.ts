import { RehearsalService } from '@rehearsal/service';
import { Project } from 'fixturify-project';
import { readFile } from 'fs/promises';
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
    project.files['index.ts'] = await readFile(
      './test/fixtures/empty-lines-restore.fixture',
      'utf-8'
    );
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
