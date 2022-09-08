import { RehearsalService } from '@rehearsal/service';
import { cleanFixturesFiles, createFixturesFromTemplateFiles } from '@rehearsal/utils';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterEach, describe, expect, test } from 'vitest';

import { ReRehearsePlugin } from '../src';

describe('Test ReRehearsalPlugin', function () {
  const fixturesPath = resolve(__dirname, 'fixtures', 're-rehearsal');

  afterEach(() => {
    cleanFixturesFiles(fixturesPath, fixturesPath);
  });

  test('run', async () => {
    const files = createFixturesFromTemplateFiles(fixturesPath, fixturesPath);
    const fileNames = files.map((file) => resolve(fixturesPath, file));
    const service = new RehearsalService({ baseUrl: fixturesPath }, fileNames);

    const plugin = new ReRehearsePlugin(service);

    expect(fileNames).toHaveLength(1);

    for (const fileName of fileNames) {
      const result = await plugin.run({ fileName });
      const resultText = service.getFileText(fileName).trim();

      expect(result).toHaveLength(1);
      expect(resultText).toEqual(readFileSync(`${fileName}.output`).toString().trim());
    }
  });
});
