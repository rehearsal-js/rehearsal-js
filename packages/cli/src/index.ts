import { Command } from 'commander';

import { version } from '../package.json';
import { migrateCommand } from './commands/migrate/index.js';
import { upgradeCommand } from './commands/upgrade.js';

const program = new Command();

program.name('rehearsal').version(version).addCommand(migrateCommand).addCommand(upgradeCommand);

export { program as rehearsal, migrateCommand, upgradeCommand };
