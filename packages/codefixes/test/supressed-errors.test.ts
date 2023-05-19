import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { Project } from 'fixturify-project';
import { Reporter } from '@rehearsal/reporter';
import { migrate } from '@rehearsal/migrate';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Supressed Errors', function () {
  const cases = [
    [
      `TS2345: Cannot read properties of undefined (reading 'flags')`,
      'supressed-errors/flags.ts',
      `// @ts-expect-error @rehearsal TODO TS2345: Argument of type '{0}' is not assignable to parameter of type 'never'. Consider verifying both types, using type assertion: '(config.value as string)', or using type guard: 'if (config.value instanceof string) { ... }'.`,
    ],
    [
      'TS2339: False expression: Token end is child end',
      'supressed-errors/missingMethod.ts',
      `// @ts-expect-error @rehearsal TODO TS2339: Property 'setRoutes' does not exist on type 'Something'.`,
    ],
  ];

  test.each(cases)('%s, %s', async (name, relativePathToFixture, expected) => {
    const fixtureDir = resolve(__dirname, 'fixtures');
    const project = Project.fromDir(fixtureDir, { linkDeps: true, linkDevDeps: true });
    await project.write();

    const file = resolve(project.baseDir, relativePathToFixture);

    const reporter = new Reporter({
      tsVersion: '',
      projectName: '@rehearsal/test',
      projectRootDir: project.baseDir,
      commandName: '@rehearsal/migrate',
    });

    const input = {
      projectRootDir: project.baseDir,
      packageDir: project.baseDir,
      filesToMigrate: [file],
      reporter,
    };

    for await (const _ of migrate(input)) {
      // no ops
    }

    const actualOutput = readFileSync(file, 'utf-8');
    expect(actualOutput).toContain(expected);
    expect(actualOutput).matchSnapshot();

    project.dispose();
  });
});
