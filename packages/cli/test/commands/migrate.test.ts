import { describe, test, expect, afterAll, beforeAll } from 'vitest';
import { join, resolve } from 'path';
import { copySync, rmSync, readdirSync, readFileSync } from 'fs-extra';
import { run } from '../test-helpers';

import execa from 'execa';

const FIXTURE_APP_DIR = resolve(__dirname, '../fixtures/app_for_migrate');
const SRC_DIR = resolve(FIXTURE_APP_DIR, 'src');
const TMP_DIR = resolve(FIXTURE_APP_DIR, 'tmp');
// const RESULTS_FILEPATH = join(FIXTURE_APP_PATH, '.rehearsal.json');

function prepareTmpDir(filename: string): string {
  rmSync(TMP_DIR, { recursive: true, force: true });
  copySync(resolve(SRC_DIR, filename), resolve(TMP_DIR, filename));
  return TMP_DIR;
}

describe('migrate command', async () => {
  test('should not do anything for TS file', async () => {
    const src_dir = prepareTmpDir('no_ops.ts');
    const result = await run('migrate', [
      '--src_dir',
      TMP_DIR,
      '--file',
      resolve(TMP_DIR, 'no_ops.ts'),
      '--report_output',
      TMP_DIR,
    ]);

    expect(result.stdout).toContain(`is a .ts file`);
  });

  test('should print additional messages with --verbose', async () => {
    const src_dir = prepareTmpDir('index.js');
    const result = await run('migrate', [
      '--src_dir',
      TMP_DIR,
      '--file',
      resolve(TMP_DIR, 'index.js'),
      '--report_output',
      TMP_DIR,
      '--verbose',
    ]);

    expect(result.stdout).toContain(`\x1B[34mdebug\x1B[39m`);
  });

  test('single file JS -> TS', async () => {
    const src_dir = prepareTmpDir('index.js');
    const result = await run('migrate', [
      '--src_dir',
      TMP_DIR,
      '--file',
      resolve(TMP_DIR, 'index.js'),
      '--report_output',
      TMP_DIR,
    ]);
    console.log(result);

    expect(result.stdout).toContain(`Conversion finished.`);
    expect(readdirSync(TMP_DIR)).toContain('index.ts');

    const content = readFileSync(resolve(TMP_DIR, 'index.ts'), 'utf-8');
    expect(content).toMatchSnapshot();
  });
});
