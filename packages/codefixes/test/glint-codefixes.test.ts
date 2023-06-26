import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { Project } from 'fixturify-project';
import { Reporter } from '@rehearsal/reporter';
import { migrate } from '@rehearsal/migrate';
import JSON5 from 'json5';
import type { TsConfigJson } from 'type-fest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TsConfigGlint extends TsConfigJson {
  glint?: {
    environment?: string | string[] | Record<string, unknown>;
    checkStandaloneTemplates?: boolean;
  };
}

const PRETTIER_CONFIG = `
{
  "printWidth": 100,
  "singleQuote": false,
  "trailingComma": "es5",
  "overrides": [
    {
      "files": "*.hbs",
      "options": {
        "parser": "glimmer"
      }
    },
    {
      "files": "*.gjs, *.gts",
      "options": {
        "parser": "glimmer"
      }
    }
  ],
  "plugins": ["prettier-plugin-ember-template-tag"]
}
`;

describe('Test glint codefixes', function () {
  const fixturesDir = resolve(__dirname, 'fixtures');

  let project: Project;
  let reporter: Reporter;
  let input: {
    projectRootDir: string;
    packageDir: string;
    filesToMigrate: Array<string>;
    reporter: Reporter;
  };

  beforeAll(async () => {
    project = Project.fromDir(fixturesDir, { linkDeps: true, linkDevDeps: true });
    project.addDependency('ember-source', '~4.11.0');
    project.addDependency('@glint/core', '^1.0.2');
    project.addDependency('@glint/environment-ember-loose', '^1.0.2');
    project.addDependency('@glint/environment-ember-template-imports', '^1.0.2');
    project.addDependency('@glimmer/component', '^1.1.2');
    project.addDependency('prettier-plugin-ember-template-tag', '^0.3.2');
    project.files['.prettierrc'] = PRETTIER_CONFIG;

    const content = project.files['tsconfig.json'] as string;
    const tsConfig: TsConfigGlint = JSON5.parse(content);

    tsConfig['glint'] = {
      environment: ['ember-loose', 'ember-template-imports', 'glimmerx'],
      checkStandaloneTemplates: true,
    };

    project.files['tsconfig.json'] = JSON5.stringify(tsConfig, { space: 2, quote: '"' });

    await project.write();

    execSync(`pnpm install`, {
      cwd: project.baseDir,
      stdio: 'ignore',
    });

    reporter = new Reporter({
      tsVersion: '',
      projectName: '@rehearsal/test',
      projectRootDir: project.baseDir,
    });

    input = {
      projectRootDir: project.baseDir,
      packageDir: project.baseDir,
      filesToMigrate: new Array<string>(),
      reporter,
    };
  });

  afterAll(() => {
    project.dispose();
  });

  test('addMissingArgToComponentSignature', async () => {
    // Generate this list of files using fixturify reading a directory
    const filesToMigrate = [
      resolve(
        project.baseDir,
        'glint-codefixes',
        'addMissingArgToComponentSignature',
        'with-missing-args.gts'
      ),
    ];

    input.filesToMigrate = filesToMigrate;

    for await (const _ of migrate(input)) {
      // no ops
    }

    for (const file of filesToMigrate) {
      const actualOutput = readFileSync(file, 'utf-8');
      expect(actualOutput).matchSnapshot();
    }
  });
});
