import { resolve } from 'path';
import { describe, expect, test } from 'vitest';
import { ReRehearsePlugin } from '../src/index.js';
import { initProject, mockPluginRunnerContext } from './utils.js';

describe('Test ReRehearsalPlugin', () => {
  test('run', async () => {
    const project = await initProject('prettier-test', {
      'index.ts': './test/fixtures/re-rehearse.ts.fixture',
    });

    const context = mockPluginRunnerContext(project);

    const plugin = new ReRehearsePlugin();

    for (const file in project.files) {
      const fileName = resolve(project.baseDir, file);

      const result = await plugin.run(fileName, context, { commentTag: '@rehearsal' });
      const resultText = context.service.getFileText(fileName).trim();

      expect(result).toHaveLength(1);
      expect(resultText).toMatchSnapshot();
    }

    project.dispose();
  });
});
