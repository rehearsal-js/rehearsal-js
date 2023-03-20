import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

function prepare(dir = '') {
  if (existsSync(join(dir, 'node_modules'))) {
    console.log(
      `[SKIPPED] Initializing fixture directory: ${dir}. It looks to have a node_modules directory. If you want to update an existing fixture base. Please 'pnpm fixtures:clean' then 'pnpm fixtures:prepare'.`
    );
    return;
  }

  console.log(`Initializing fixture directory: ${dir}`);
  // The (app|addon)-template needs a node_modules directory for
  // `Project.fromDir()` (fixturify-project) to work.
  execSync(`npm --version && npm install`, {
    cwd: dir,
    stdio: 'ignore', // Otherwise this will output warning from install command
  });
}

console.log('Initializing fixtures...');

const someDirPaths = process.argv.slice(2);

someDirPaths.forEach((someDir) => {
  prepare(someDir);
});
