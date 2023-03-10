import { resolve } from 'path';
import { describe, expect, test } from 'vitest';
import { PrettierPlugin } from '../src/index.js';
import { initProject, mockPluginRunnerContext } from './utils.js';

describe('Test PrettierPlugin', () => {
  test('run', async () => {
    const project = await initProject('prettier-test', {
      'index.ts': './test/fixtures/prettier.ts.fixture',
    });

    const context = mockPluginRunnerContext(project);

    const plugin = new PrettierPlugin();

    for (const file in project.files) {
      const fileName = resolve(project.baseDir, file);

      const result = await plugin.run(fileName, context, {});
      const resultText = context.rehearsal.getFileText(fileName).trim();

      expect(result).toHaveLength(1);
      expect(resultText).toMatchSnapshot();
    }

    project.dispose();
  });
});
