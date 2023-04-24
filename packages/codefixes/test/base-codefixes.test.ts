import { readdirSync, readFileSync } from 'node:fs';
import { dirname, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Project } from 'fixturify-project';
import { Reporter } from '@rehearsal/reporter';
import { migrate } from '@rehearsal/migrate';
import type fixturify from 'fixturify';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Test base codefixes', function () {
  const fixturesDir = resolve(__dirname, 'fixtures');
  const codefixesDir = resolve(__dirname, '../src/fixes');
  let project: Project;

  // eg. ["addErrorTypeGuard","addMissingExport","addMissingTypesBasedOnInheritance","makeMemberOptional"]
  const transforms = readdirSync(codefixesDir).map((file) => parse(file).name);

  beforeEach(() => {
    project = Project.fromDir(fixturesDir, { linkDeps: true, linkDevDeps: true });
  });

  afterEach(() => {
    project.dispose();
  });

  /**
   * Compiles the project with LanguageService and apply autofix
   * on corresponding diagnostic messages
   */
  async function runMigrate(basePath: string): Promise<void> {
    const reporter = new Reporter({
      tsVersion: '',
      projectName: '@rehearsal/test',
      basePath: project.baseDir,
      commandName: '@rehearsal/migrate',
    });

    await project.write();

    migrate({ basePath, reporter, entrypoint: '', sourceFiles: [resolve(basePath, 'index.js')] });
  }

  test.each(transforms)('%s', async (transform) => {
    console.log(transform);
    const migrateProjectDir = resolve(project.baseDir, transform);

    await runMigrate(migrateProjectDir);

    expect(typeof project.files[transform] === 'object').toBe(true);
    expect(project.files[transform] === null).toBe(false);

    // SAFETY: the above assertions narrow the type to DirJSON.
    const files = project.files[transform] as fixturify.DirJSON;

    for (const input of Object.keys(files)) {
      const actualOutput = readFileSync(resolve(migrateProjectDir, input), 'utf-8');

      expect(actualOutput).matchSnapshot();
    }
  });
});
