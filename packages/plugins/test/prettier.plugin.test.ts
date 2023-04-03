import { resolve } from 'path';
import { describe, expect, test } from 'vitest';
import { isPrettierUsedForFormatting, PrettierPlugin } from '../src/index.js';
import { initProject, mockPluginRunnerContext } from './utils.js';

describe('Test PrettierPlugin', () => {
  test('run default', async () => {
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
      '.prettierrc': './test/fixtures/.prettierrc',
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

  test('isPrettierUsed, prettier config exists', async () => {
    const project = await initProject('prettier-config', {
      '.prettierrc': './test/fixtures/.prettierrc', // <= this one
      'index.ts': './test/fixtures/prettier.ts',
    });

    const targetFile = resolve(project.baseDir, 'index.ts');
    const isPrettierUsed = isPrettierUsedForFormatting(targetFile);

    expect(isPrettierUsed).toBeTruthy();

    project.dispose();
  });

  test('isPrettierUsed, no prettier config ', async () => {
    const project = await initProject('prettier-config', {
      'index.ts': './test/fixtures/prettier.ts',
    });

    const targetFile = resolve(project.baseDir, 'index.ts');
    const isPrettierUsed = isPrettierUsedForFormatting(targetFile);

    expect(isPrettierUsed).toBeFalsy();

    project.dispose();
  });
});
