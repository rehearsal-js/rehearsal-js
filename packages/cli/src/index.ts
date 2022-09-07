import { Command } from 'commander';
import { version } from '../package.json';

import { upgradeCommand } from "./commands/upgrade";
import { migrateCommand } from "./commands/migrate";

const program = new Command();

program
  .name('rehearsal')
  .version(version)
  .addCommand(upgradeCommand)
  .addCommand(migrateCommand)
  .parse(process.argv);

export { program as cli };
