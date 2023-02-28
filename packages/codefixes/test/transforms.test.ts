import { copyFileSync, readdirSync, readFileSync, mkdirSync, realpathSync, rmSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copySync } from 'fs-extra/esm';
import { Reporter } from '@rehearsal/reporter';
import { afterEach, describe, expect, test } from 'vitest';
import { upgrade } from '@rehearsal/upgrade';
import { dirSync } from 'tmp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Test transform', function () {
  const fixturesDir = resolve(__dirname, 'fixtures');
  const codefixesDir = resolve(__dirname, '../src/fixes');

  // eg. ["addErrorTypeGuard","addMissingExport","addMissingTypesBasedOnInheritance","makeMemberOptional"]
  const transforms = readdirSync(codefixesDir);

  afterEach(() => {
    // cleanupTsFiles(fixturesDir, transforms);
  });

  test.each(transforms)('%s', async (transform) => {
    const codefixesFixesTransformFixtureDir = resolve(codefixesDir, transform, 'fixtures');

    copyFiles(transform, codefixesFixesTransformFixtureDir, fixturesDir);

    const upgradeProjectDir = resolve(fixturesDir, transform);

    await runUpgrade(upgradeProjectDir);

    // Compare each updated .ts file with expected .ts.output
    const expectedOutputFiles = getExpectedOutputFiles(codefixesFixesTransformFixtureDir);

    for (const expectedOutputFile of expectedOutputFiles) {
      const expectedOutput = readFileSync(expectedOutputFile).toString();
      const filename = basename(expectedOutputFile).replace('.output', '');
      const actualOutput = readFileSync(resolve(upgradeProjectDir, `${filename}`)).toString();

      expect(expectedOutput).toEqual(actualOutput);
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

// we want to be sure we maintain the current formatting of the files
// eg we dont want prettier to run on the files which is why we copy the files as .input/.output
function copyFiles(
  transformName: string,
  fromTransformFixturesDir: string,
  toTestFixturesDir: string
): void {
  // get all files which match from the fromTransformDir and copyFileSync to the toTestFixturesDir
  const files = readdirSync(fromTransformFixturesDir, { withFileTypes: true });
  // stick the files here and create the dir
  const testFixtureTransformDir = resolve(toTestFixturesDir, transformName);
  mkdirSync(testFixtureTransformDir, { recursive: true });

  // we only want files which end in .ts.input
  files
    .filter((file) => file.isFile() && file.name.endsWith('.ts.input'))
    .forEach((file) => {
      // create the folder structure in the toTestFixturesDir
      // eg. /rehearsal-js/packages/upgrade/test/fixtures/addErrorTypeGuard
      // copy the file from the fromTransformFixturesDir to the toTestFixturesDir
      // copyFileSync(`${file}.input`, resolve(basePath, parse(file).base));
      // remove the .input from the filename
      const filename = file.name.replace('.input', '');
      copyFileSync(
        resolve(fromTransformFixturesDir, file.name),
        resolve(testFixtureTransformDir, filename)
      );
    });
}

function prepareTmpDir(dir: string): string {
  const migrateFixturesDir = resolve(__dirname, '../fixtures/app_for_migrate');
  const testSrcDir = resolve(migrateFixturesDir, 'src');
  const srcDir = resolve(testSrcDir, dir);
  const { name: targetDir } = dirSync();
  copySync(srcDir, targetDir);
  return realpathSync(targetDir);
}
