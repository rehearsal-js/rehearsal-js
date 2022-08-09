import { Command } from 'commander';
import { version } from '../package.json';

const program = new Command();

program
  .name('rehearsal')
  .version(version)
  .command('upgrade', 'update installed packages', { executableFile: './commands/upgrade' })
  .command('migrate', 'update installed packages', { executableFile: './commands/migrate' });

program.parse(process.argv);
