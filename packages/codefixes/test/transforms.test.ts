import { readdirSync, readFileSync, realpathSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copySync } from 'fs-extra/esm';
import { afterEach, describe, expect, test, beforeEach } from 'vitest';
import { dirSync, setGracefulCleanup } from 'tmp';
import { Reporter } from '../../reporter/src/index.js';
import { upgrade } from '../../upgrade/src/upgrade.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Test transform', function () {
  const fixturesDir = resolve(__dirname, 'fixtures');
  const codefixesDir = resolve(__dirname, '../src/fixes');
  let tmpDir: string;

  // eg. ["addErrorTypeGuard","addMissingExport","addMissingTypesBasedOnInheritance","makeMemberOptional"]
  const transforms = readdirSync(codefixesDir);

  beforeEach(() => {
    // clone the fixturesDir to a tmp dir
    const { name: targetTmpDir } = dirSync();
    copySync(fixturesDir, targetTmpDir);
    tmpDir = realpathSync(targetTmpDir);
  });

  afterEach(() => {
    setGracefulCleanup();
  });

  test.each(transforms)('%s', async (transform) => {
    const codefixesFixesTransformFixtureDir = resolve(codefixesDir, transform, 'fixtures');
    const upgradeProjectDir = resolve(tmpDir, transform);

    await runUpgrade(upgradeProjectDir);

    // Compare each updated .ts file with expected .ts.output
    const expectedOutputFiles = getExpectedOutputFiles(codefixesFixesTransformFixtureDir);

    for (const expectedOutputFile of expectedOutputFiles) {
      const filename = basename(expectedOutputFile).replace('.output', '');
      const actualOutput = readFileSync(resolve(upgradeProjectDir, `${filename}`)).toString();

      expect(actualOutput).matchSnapshot();
    }
  });
});

/**
 * Compiles the project with LanguageService and apply autofix
 * on corresponding diagnostic messages
 */
async function runUpgrade(basePath: string): Promise<void> {
  const reporter = new Reporter({
    tsVersion: '',
    projectName: '@rehearsal/test',
    basePath: '',
    commandName: '@rehearsal/migrate',
  });
  await upgrade({ basePath, reporter, entrypoint: '' });
}

function getExpectedOutputFiles(path: string): string[] {
  const filesInput = readdirSync(path, { withFileTypes: true });
  // we only want files which end in .ts.output
  return filesInput
    .filter((file) => file.isFile() && file.name.endsWith('.ts.output'))
    .map((file) => resolve(path, file.name));
}
