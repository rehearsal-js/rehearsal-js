import { resolve } from 'path';
import { describe, expect, test } from 'vitest';
import { PrettierPlugin } from '../src/index.js';
import { initProject, mockPluginRunnerContext } from './utils.js';

describe('Test PrettierPlugin', () => {
  test('rung default', async () => {
    const project = await initProject('prettier-default', {
      'index.ts': './test/fixtures/prettier.ts',
    });

    const context = mockPluginRunnerContext(project);

    const plugin = new PrettierPlugin();

    for (const file in project.files) {
      const fileName = resolve(project.baseDir, file);

      const result = await plugin.run(fileName, context);
      const resultText = context.service.getFileText(fileName).trim();

      expect(result).toHaveLength(1);
      expect(resultText).toMatchSnapshot();
    }

    project.dispose();
  });

  test('run with config', async () => {
    const project = await initProject('prettier-config', {
      'index.ts': './test/fixtures/prettier.ts',
      '.prettierrc': './test/fixtures/.prettierrc',
    });

    const context = mockPluginRunnerContext(project);

    const plugin = new PrettierPlugin();

    for (const file in project.files) {
      const fileName = resolve(project.baseDir, file);

      const result = await plugin.run(fileName, context);
      const resultText = context.service.getFileText(fileName).trim();

      expect(result).toHaveLength(1);
      expect(resultText).toMatchSnapshot();
    }

    project.dispose();
  });
});
