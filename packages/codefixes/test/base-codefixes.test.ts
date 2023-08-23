import { readdirSync, readFileSync } from 'node:fs';
import { dirname, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { Project } from 'fixturify-project';
import { Reporter } from '@rehearsal/reporter';
import { migrate } from '@rehearsal/migrate';
import fixturify from 'fixturify';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Test base codefixes', function () {
  const fixturesDir = resolve(__dirname, 'fixtures');
  const codefixesDir = resolve(__dirname, '../src/fixes/');

  // eg. ["addErrorTypeGuard","addMissingExport","addMissingTypesBasedOnInheritance","makeMemberOptional"]
  const transforms = readdirSync(codefixesDir)
    .map((file) => parse(file).name)
    .filter((item) => item.startsWith('addMissingReturnTypes')); // Exclude glint directory from test, this will be tested by glint-codefixes

  test.each(transforms)('%s', async (transform) => {
    const project = Project.fromDir(fixturesDir, { linkDeps: true, linkDevDeps: true });
    await project.write();

    const dir = 'base-codefixes';

    const files = (project.files[dir] as fixturify.DirJSON)[transform] as fixturify.DirJSON;

    expect(files, `Test files are missing for ${transform}`).toBeTypeOf('object');

    const filesToMigrate = Object.keys(files).map((file) =>
      resolve(project.baseDir, dir, transform, file)
    );

    const reporter = new Reporter({
      tsVersion: '',
      projectName: '@rehearsal/test',
      projectRootDir: project.baseDir,
    });

    const input = {
      projectRootDir: project.baseDir,
      packageDir: project.baseDir,
      filesToMigrate: filesToMigrate,
      reporter,
    };

    for await (const _ of migrate(input)) {
      // no ops
    }

    console.log(readFileSync(input.filesToMigrate[0], 'utf-8'));

    for (const file of filesToMigrate) {
      const actualOutput = readFileSync(file, 'utf-8');

      expect(actualOutput).matchSnapshot();
    }

    project.dispose();
  });
});
