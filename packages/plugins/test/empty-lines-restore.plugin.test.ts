import { describe, test, expect, afterEach } from 'vitest';
import { resolve } from 'path';
import { readFileSync } from 'fs';

import { cleanFixturesFiles, createFixturesFromTemplateFiles } from '@rehearsal/utils';
import { RehearsalService } from '@rehearsal/service';

import { EmptyLinesRestorePlugin } from '../src';

describe('Test EmptyLinesRestorePlugin', function () {
  const fixturesPath = resolve(__dirname, 'fixtures', 'empty-lines-restore');

  afterEach(() => {
    cleanFixturesFiles(fixturesPath, fixturesPath);
  });

  test('run', async () => {
    const files = createFixturesFromTemplateFiles(fixturesPath, fixturesPath);
    const fileNames = files.map((file) => resolve(fixturesPath, file));
    const service = new RehearsalService({ baseUrl: fixturesPath }, fileNames);

    const plugin = new EmptyLinesRestorePlugin(service);

    expect(fileNames).toHaveLength(1);

    for (const fileName of fileNames) {
      const result = await plugin.run({ fileName });
      const resultText = service.getFileText(fileName).trim();

      expect(result).toHaveLength(1);
      expect(resultText).toEqual(readFileSync(`${fileName}.output`).toString().trim());
    }
  });
});
