import { resolve } from 'node:path';
import { writeJSONSync } from 'fs-extra/esm';
import { tsConfigTask } from '../../src/commands/migrate/tasks/index.js';
import { listrTaskRunner, createMigrateOptions } from './index.js';
import { CustomConfig, MigrateCommandOptions } from '../../src/types.js';

export async function runTsConfig(basePath: string, opts?: Partial<MigrateCommandOptions>): Promise<void> {
  const options = createMigrateOptions(basePath, opts);
    const context = { sourceFilesWithRelativePath: [] };
    const tasks = [tsConfigTask(options, context)];
    await listrTaskRunner(tasks);
}

export function createUserConfig(basePath: string, config: CustomConfig): void {
  const configPath = resolve(basePath, 'rehearsal-config.json');
  writeJSONSync(configPath, config);
}