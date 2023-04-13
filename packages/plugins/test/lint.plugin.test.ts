import { resolve } from 'path';
import { describe, expect, test } from 'vitest';
import { LintPlugin } from '../src/index.js';
import { initProject, mockPluginRunnerContext } from './utils.js';

describe('Test LintPlugin', () => {
  test('run', async () => {
    const project = await initProject('prettier-test', {
      'index.js': './test/fixtures/lint.ts',
    });

    const context = mockPluginRunnerContext(project);

    for (const file in project.files) {
      const fileName = resolve(project.baseDir, file);

      const plugin = new LintPlugin(fileName, context, {
        reportErrors: true,
        eslintOptions: {
          useEslintrc: false,
          fix: true,
          baseConfig: {
            extends: ['eslint:recommended', 'plugin:prettier/recommended'],
          },
        },
      });

      const result = await plugin.run();

      const resultText = context.service.getFileText(fileName).trim();

      expect(result).toHaveLength(1);
      expect(resultText).toMatchSnapshot();

      expect(context.reporter.currentRun.items).toHaveLength(1);
      expect(context.reporter.currentRun.items).toMatchSnapshot();
    }

    project.dispose();
  });
});
