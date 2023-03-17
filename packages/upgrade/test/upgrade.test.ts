import { readFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Reporter } from '@rehearsal/reporter';
import { afterAll, describe, expect, test } from 'vitest';
import { createLogger, format, transports } from 'winston';
import { Project } from 'fixturify-project';

import { upgrade } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Test upgrade', async function () {
  const fixturePath = resolve(__dirname, 'fixtures', 'upgrade');
  const project = Project.fromDir(fixturePath, { linkDeps: true, linkDevDeps: true });

  project.files['.eslintrc.json'] = await readFile(
    resolve(__dirname, 'fixtures', '.eslintrc.json'),
    'utf-8'
  );

  const logger = createLogger({
    transports: [new transports.Console({ format: format.cli(), level: 'debug' })],
  });

  const reporter = new Reporter(
    {
      tsVersion: '',
      projectName: '@rehearsal/test',
      basePath: project.baseDir,
      commandName: '@rehearsal/upgrade',
    },
    logger
  );

  await project.write();

  const result = await upgrade({ basePath: project.baseDir, logger, reporter, entrypoint: '' });

  afterAll(() => {
    project.dispose();
  });

  test('should fix errors or provide hints for errors in the original files', async () => {
    expect(result).toBeDefined();

    for (const file of Object.keys(project.files)) {
      const input = await readFile(join(project.baseDir, file), 'utf-8');

      expect(input).toMatchSnapshot();
    }
  });

  test('should output the correct data from upgrade', () => {
    const { report } = reporter;

    report.summary[0].timestamp = '9/22/2022, 13:48:38';
    report.summary[0].basePath = '';

    expect(report).toMatchSnapshot();
  });
});
