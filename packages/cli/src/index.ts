import { URL } from 'node:url';
import { resolve } from 'node:path';
import { Command } from 'commander';
import { migrateCommand } from './commands/migrate/index.js';
import { upgradeCommand } from './commands/upgrade.js';
import { PackageJson } from './types.js';

const __dirname = new URL('.', import.meta.url).pathname;
const { version } = PackageJson.parse(resolve(__dirname, '../package.json'));

const program = new Command();

program.name('rehearsal').version(version).addCommand(migrateCommand).addCommand(upgradeCommand);

export { program as rehearsal, migrateCommand, upgradeCommand };
