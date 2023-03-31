import { resolve } from 'node:path';
import { readdirSync, promises as fs } from 'node:fs';
import { afterEach, beforeEach, afterAll, describe, expect, test, vi } from 'vitest';
import { createLogger, format, transports } from 'winston';
import { Report } from '@rehearsal/reporter';
import { Project } from 'fixturify-project';
import {
  getEmberAppProject,
  getEmberAppWithInRepoAddonProject,
  getEmberAppWithInRepoEngineProject,
  getEmber4AppProject,
} from '@rehearsal/test-support';
import {
  analyzeTask,
  depInstallTask,
  initTask,
  lintConfigTask,
  sequentialTask,
  tsConfigTask,
} from '../../../src/commands/migrate/tasks/index.js';

import {
  createMigrateOptions,
  createOutputStream,
  listrTaskRunner,
} from '../../test-helpers/index.js';

const logger = createLogger({
  transports: [new transports.Console({ format: format.cli() })],
});

const projects = {
  emberApp: getEmberAppProject(),
  emberAppWithInRepoAddon: getEmberAppWithInRepoAddonProject(),
  emberAppwithInRepoEngine: getEmberAppWithInRepoEngineProject(),
  ember4App: getEmber4AppProject(),
};

describe('Task: sequential - ember app', () => {
  for (const [name, originalProject] of Object.entries(projects)) {
    describe(name, () => {
      let project: Project;

      let output = '';
      let outputStream = createOutputStream();

      beforeEach(async () => {
        project = originalProject.clone();
        await project.write();

        outputStream = createOutputStream();

        vi.spyOn(console, 'info').mockImplementation((chunk: string) => {
          chunk = chunk.replace(new RegExp(project.baseDir, 'g'), '<tmp-path>');
          output += `${chunk}\n`;
          outputStream.push(`${chunk}\n`);
        });
        vi.spyOn(console, 'log').mockImplementation((chunk) => {
          output += `${chunk}\n`;
          outputStream.push(`${chunk}\n`);
        });
        vi.spyOn(console, 'error').mockImplementation((chunk) => {
          output += `${chunk}\n`;
          outputStream.push(`${chunk}\n`);
        });
      });

      afterEach(() => {
        output = '';
        vi.clearAllMocks();
        outputStream.destroy();
        project.dispose();
      });

      afterAll(() => {
        originalProject.dispose();
      });

      test('sequential run regen on the existing report, and run migrate on current base path and entrypoint', async () => {
        const options = createMigrateOptions(project.baseDir, { entrypoint: '', ci: true });
        const previousRuns = {
          previousFixedCount: 1,
          paths: [{ basePath: project.baseDir, entrypoint: 'foo.ts' }],
        };
        const tasks = [
          initTask(options),
          depInstallTask(options),
          tsConfigTask(options),
          lintConfigTask(options),
          analyzeTask(options),
          sequentialTask(options, logger, previousRuns),
        ];

        await listrTaskRunner(tasks);
        expect(output).toMatchSnapshot();

        const appPath = resolve(project.baseDir, 'app');
        const appFiles = readdirSync(appPath);
        expect(appFiles).toContain('app.ts');
        expect(appFiles).toContain('router.ts');
        expect(appFiles).toContain('index.html');

        const report = JSON.parse(
          await fs.readFile(resolve(project.baseDir, '.rehearsal', 'migrate-report.json'), 'utf-8')
        ) as Report;

        const { summary } = report;
        expect(summary?.length).toBe(2);
        expect(summary?.[0].basePath).toEqual(summary?.[1].basePath);
        expect(summary?.[0].entrypoint).toBe('foo.ts');
        expect(summary?.[1].entrypoint).toBe('');
      });
    });
  }
});
