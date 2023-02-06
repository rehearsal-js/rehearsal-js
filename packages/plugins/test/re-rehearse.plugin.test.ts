import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { RehearsalService } from '@rehearsal/service';
import { Project } from 'fixturify-project';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Reporter } from '@rehearsal/reporter';
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
    project.files['index.ts'] = await readFile('./test/fixtures/re-rehearse.fixture', 'utf-8');
    project.write();
    const fileNames = Object.keys(project.files).map((file) => resolve(project.baseDir, file));

    const rehearsal = new RehearsalService({ baseUrl: project.baseDir }, fileNames);
    const reporter = new Reporter({
      tsVersion: '',
      projectName: '@rehearsal/test',
      basePath: '',
      commandName: '@rehearsal/migrate',
    });

    const plugin = new ReRehearsePlugin();

    for (const fileName of fileNames) {
      const result = await plugin.run(
        fileName,
        { basePath: '', rehearsal, reporter },
        { commentTag: '@rehearsal' }
      );
      const resultText = rehearsal.getFileText(fileName).trim();

      expect(result).toHaveLength(1);
      expect(resultText).toMatchSnapshot();
    }
  });
});
