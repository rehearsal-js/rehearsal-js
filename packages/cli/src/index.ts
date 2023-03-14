import { URL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert';
import { promises as fs } from 'node:fs';
import { Command } from 'commander';
import { migrateCommand } from './commands/migrate/index.js';
import { upgradeCommand } from './commands/upgrade.js';
import { PackageJson } from './types.js';

const __dirname = new URL('.', import.meta.url).pathname;
const { version } = PackageJson.parse(
  JSON.parse(await fs.readFile(resolve(__dirname, '../package.json'), 'utf-8'))
);

const program = new Command();

assert(version, 'Has a rehearsal version');

program.name('rehearsal').version(version).addCommand(migrateCommand).addCommand(upgradeCommand);

export { program as rehearsal, migrateCommand, upgradeCommand };
