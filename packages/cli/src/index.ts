import { Command } from 'commander';
import { version } from '../package.json';

import { migrateCommand } from './commands/migrate';
import { upgradeCommand } from './commands/upgrade';

const program = new Command();

program.name('rehearsal').version(version).addCommand(migrateCommand).addCommand(upgradeCommand);

export { program as rehearsal, migrateCommand, upgradeCommand };
