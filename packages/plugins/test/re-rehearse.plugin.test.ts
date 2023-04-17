import { resolve } from 'path';
import { describe, expect, test } from 'vitest';
import { ReRehearsePlugin } from '../src/index.js';
import { initProject, mockPluginRunnerContext } from './utils.js';

describe('Test ReRehearsalPlugin', () => {
  test('run', async () => {
    const project = await initProject('prettier-test', {
      'index.ts': './test/fixtures/re-rehearse.ts',
    });

    const context = mockPluginRunnerContext(project);

    for (const file in project.files) {
      const fileName = resolve(project.baseDir, file);
      const plugin = new ReRehearsePlugin(fileName, context, { commentTag: '@rehearsal' });

      const result = await plugin.run();
      const resultText = context.service.getFileText(fileName).trim();

      expect(result).toHaveLength(1);
      expect(resultText).toMatchSnapshot();
    }

    project.dispose();
  });
});
