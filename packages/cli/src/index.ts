import { URL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import { Command } from 'commander';
import { migrateCommand } from './commands/migrate/index.js';
import { upgradeCommand } from './commands/upgrade.js';
import type { PackageJson } from 'type-fest';

const __dirname = new URL('.', import.meta.url).pathname;
const { version } = JSON.parse(
  await fs.readFile(resolve(__dirname, '../package.json'), 'utf-8')
) as PackageJson;

const program = new Command();

assert(version, 'Has a rehearsal version');

program.name('rehearsal').version(version).addCommand(migrateCommand).addCommand(upgradeCommand);

export { program as rehearsal, migrateCommand, upgradeCommand };
