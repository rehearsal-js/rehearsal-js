import { Command } from 'commander';
import { readJSONSync } from 'fs-extra/esm';

import { migrateCommand } from './commands/migrate/index.js';
import { upgradeCommand } from './commands/upgrade.js';

const { version } = readJSONSync('package.json') as { version: string };
const program = new Command();

program.name('rehearsal').version(version).addCommand(migrateCommand).addCommand(upgradeCommand);

export { program as rehearsal, migrateCommand, upgradeCommand };
