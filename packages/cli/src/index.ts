import { Command } from 'commander';
import { version } from '../package.json';
import { join } from 'path';

const program = new Command();

program
  .name('rehearsal')
  .version(version)
  .command(
    'upgrade',
    'Upgrade typescript dev-dependency with compilation insights and auto-fix options',
    {
      executableFile: join(__dirname, './commands/upgrade'),
    }
  )
  .command('migrate', 'Migrate Javascript project to Typescript', {
    executableFile: join(__dirname, './commands/migrate'),
  });

export { program as cli };
