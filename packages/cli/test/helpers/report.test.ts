import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Reporter } from '@rehearsal/reporter';
import { generateReports, getReportSummary, getRegenSummary } from '../../src/helpers/report.js';
import { initTask } from '../../../src/commands/move/tasks/index.js';
import { prepareProject, listrTaskRunner } from '../../test-helpers/index.js';
import type { MoveCommandContext, MoveCommandOptions } from '../../../src/types.js';
import type { Project } from 'fixturify-project';

describe('Helpers: Report', () => {
  let project: Project;

  beforeEach(async () => {
    project = prepareProject('multi_packages');
    await project.write();
  });

  afterEach(() => {
    vi.clearAllMocks();
    project.dispose();
  });

  test('generateReports all formats', async () => {
    const command = 'fix';
    const reporter = new Reporter();
    const outputDir = resolve(project.baseDir, '/reports');
    // all the report formats
    const formats = ['json', 'sarif', 'md', 'sonar'];

    // generate the report
    const reports = await generateReports(command, reporter, outputDir, formats);

    // validate the report
  });

  test('validate source option with file', async () => {
    const source = 'src/foo/buz/biz.js';
    const options: MoveCommandOptions = {
      basePath: project.baseDir,
      dryRun: true,
      source,
    };
    const tasks = [initTask(options)];
    const ctx = await listrTaskRunner<MoveCommandContext>(tasks);

    expect(ctx.jsSourcesRel).toStrictEqual([source]);
  });
});
