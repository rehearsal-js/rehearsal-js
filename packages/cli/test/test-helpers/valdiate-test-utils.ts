import { type Logger } from 'winston';

import { validateTask } from '../../src/commands/migrate/tasks/index.js';
import {
  listrTaskRunner,
  createMigrateOptions,
} from './index.js';
import { MigrateCommandOptions } from '../../src/types.js';

export async function runValidate(basePath: string, logger: Logger, opts?: Partial<MigrateCommandOptions>): Promise<void> {
  const options = createMigrateOptions(basePath, opts);
  const tasks = [validateTask(options, logger)];

  await listrTaskRunner(tasks);
}