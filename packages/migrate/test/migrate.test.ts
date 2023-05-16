import { readFileSync } from 'node:fs';
import path, { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Project } from 'fixturify-project';
import { type Report, Reporter } from '@rehearsal/reporter';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { getExcludePatterns } from '@rehearsal/migration-graph-shared';
import { migrate, MigrateInput, resolveIgnoredPaths } from '../src/migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ember project
const projectPath = resolve(__dirname, 'fixtures', 'project');

function changeExtension(file: string, ext: string): string {
  const parts = path.parse(file);

  ext = ext.startsWith('.') ? ext : `.${ext}`;

  return path.format({
    ...parts,
    ext,
    base: undefined,
  });
}

function cleanOutput(output: string, basePath: string): string {
  const pathRegex = new RegExp(basePath, 'g');
  const versionRegex = /(@rehearsal\/(move|migrate|graph|fix))(.+)/g;
  return removeSpecialChars(
    output.replace(pathRegex, '<tmp-path>').replace(versionRegex, '$1<test-version>')
  );
}

function removeSpecialChars(input: string): string {
  const specialCharRegex = /[^A-Za-z 0-9 .,?""!@#$%^&*()-_=+;:<>/\\|}{[\]`~\n]*/g;
  return input
    .replace(specialCharRegex, '')
    .split('\n')
    .map((line) => {
      if (!line.trim()) {
        return '';
      }
      return line;
    })
    .filter((line) => line.trim())
    .join('\n');
}

const extLookup = {
  '.js': '.ts',
  '.gjs': '.gts',
  '.gts': '.gts',
  '.hbs': '.hbs',
  '.ts': '.ts',
};

type ValidExtension = keyof typeof extLookup;

const validExtensions = Object.keys(extLookup);

function isValidExtension(ext: string): ext is ValidExtension {
  return validExtensions.includes(ext);
}

function expectFile(filePath: string): Vi.Assertion<string> {
  return expect(readFileSync(filePath, 'utf-8'));
}

function prepareInputFiles(
  project: Project,
  files: string[] = ['index.ts'],
  dirPath: string = 'src'
): string[][] {
  const inputs = files.map((file) => {
    return resolve(project.baseDir, dirPath, file);
  });

  const outputs = inputs.map((file) => {
    const fileExt = path.extname(file);

    if (!isValidExtension(fileExt)) {
      throw new Error(`found a file extension we don't know about: ${fileExt}`);
    }

    const ext = extLookup[fileExt];

    return changeExtension(file, ext);
  });

  return [inputs, outputs];
}

describe('fix', () => {
  describe('.gts', () => {
    let project: Project;
    let reporter: Reporter;

    beforeEach(async () => {
      project = Project.fromDir(projectPath, { linkDeps: true, linkDevDeps: true });

      delete project.files['index.ts'];

      await project.write();

      reporter = new Reporter({
        tsVersion: '',
        projectName: '@rehearsal/test',
        projectRootDir: project.baseDir,
        commandName: '@rehearsal/fix',
      });
    });

    afterEach(() => {
      project.dispose();
    });

    test('with bare template', async () => {
      // since we are no longer doing a file conversion input and output are the same
      const [inputs, outputs] = prepareInputFiles(project, ['template-only.gts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('with template assigned to variable', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['template-only-variable.gts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('with class', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['with-class.gts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('with non-qualified service', async () => {
      // we now have to expect the tsconfig paths have been set as rehearsal will not do it
      // Update the tsconfig with any module name mapping so that any subsequent type checking will
      // be actually work if we happen to encounter any ember addons that specify a `moduleName`
      const [inputs, outputs] = prepareInputFiles(project, ['with-non-qualified-service.gts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      // add a counter to make sure we are not running forever
      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();

      reporter.printReport(project.baseDir);

      const jsonReport = resolve(project.baseDir, 'rehearsal-report.json');
      const report = JSON.parse(readFileSync(jsonReport).toString()) as Report;
      expect(report.summary[0].basePath).toMatch(project.baseDir);
    });

    test('with service map', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['with-mapped-service.gts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('with qualified service', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['with-qualified-service.gts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('when missing a local prop', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['missing-local-prop.gts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('still fixes the file if there are no errors', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['gjs-no-errors.gts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });
  });

  describe('.hbs', () => {
    let project: Project;
    let reporter: Reporter;

    beforeEach(async () => {
      project = Project.fromDir(projectPath, { linkDeps: true, linkDevDeps: true });

      delete project.files['index.ts'];

      await project.write();

      reporter = new Reporter({
        tsVersion: '',
        projectName: '@rehearsal/test',
        projectRootDir: project.baseDir,
        commandName: '@rehearsal/fix',
      });
    });

    afterEach(() => {
      project.dispose();
    });

    test('simple class', async () => {
      const [inputs, outputs] = prepareInputFiles(project, [
        'missing-local-prop.hbs',
        'missing-local-prop.ts',
      ]);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).matchSnapshot();
      expectFile(outputs[1]).matchSnapshot();
    });

    test('more involved class', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['salutation.hbs', 'salutation.ts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
      expectFile(outputs[1]).toMatchSnapshot();

      reporter.printReport(project.baseDir);

      const jsonReport = resolve(project.baseDir, 'rehearsal-report.json');
      const report = JSON.parse(readFileSync(jsonReport).toString()) as Report;
      const reportedItems = report.items.filter((item) =>
        item.analysisTarget.includes('src/salutation.ts')
      );

      expect(reportedItems.length).toBeGreaterThan(0);
      expect(report.summary[0].basePath).toMatch(project.baseDir);
    });
  });

  describe('.ts', () => {
    let project: Project;
    let reporter: Reporter;

    beforeEach(() => {
      project = Project.fromDir(projectPath, { linkDeps: true, linkDevDeps: true });

      reporter = new Reporter({
        tsVersion: '',
        projectName: '@rehearsal/test',
        projectRootDir: project.baseDir,
        commandName: '@rehearsal/fix',
      });
    });

    afterEach(() => {
      project.dispose();
    });

    test('class with missing prop', async () => {
      project.mergeFiles({
        src: {
          'foo.ts': `class Foo {
  hello() {
    return this.name;
  }
}
`,
        },
      });

      await project.write();

      const [inputs, outputs] = prepareInputFiles(project, ['foo.ts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('glimmerx inline hbs', async () => {
      await project.write();

      const [inputs, outputs] = prepareInputFiles(project, ['glimmerx-component.ts']);
      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('inline hbs in tests', async () => {
      await project.write();

      const [inputs, outputs] = prepareInputFiles(project, ['ember-integration-test.ts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('with non-qualified service', async () => {
      await project.write();

      const [inputs, outputs] = prepareInputFiles(project, ['with-non-qualified-service.ts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('with service map', async () => {
      await project.write();

      const [inputs, outputs] = prepareInputFiles(project, ['with-mapped-service.ts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('with qualified service', async () => {
      await project.write();

      const [inputs, outputs] = prepareInputFiles(project, ['with-qualified-service.ts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('with qualified service in subpackage', async () => {
      await project.write();

      const [inputs, outputs] = prepareInputFiles(
        project,
        ['with-qualified-service.ts'],
        'packages/foo'
      );

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: resolve(project.baseDir, 'packages/foo'),
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });
  });

  describe('.ts, .gts', () => {
    let project: Project;
    let reporter: Reporter;

    beforeEach(() => {
      project = Project.fromDir(projectPath, { linkDeps: true, linkDevDeps: true });

      reporter = new Reporter({
        tsVersion: '',
        projectName: '@rehearsal/test',
        projectRootDir: project.baseDir,
        commandName: '@rehearsal/migrate',
      });
    });

    afterEach(() => {
      project.dispose();
    });

    test('resolveIgnoredPaths()', async () => {
      await project.write();

      const ignoredPaths = resolveIgnoredPaths(
        ['packages/**/*', 'src/with-class.gts'],
        project.baseDir,
        getExcludePatterns
      );
      const sanitizedPaths = ignoredPaths.map((path) => {
        return cleanOutput(path, project.baseDir);
      });

      expect(ignoredPaths.length).toBe(4);
      expect(sanitizedPaths).toMatchSnapshot();
    });

    test('previously migrated .ts', async () => {
      await project.write();

      const [inputs, outputs] = prepareInputFiles(project, ['already-migrated-js-to.ts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      const expected = `import type FooService from "foo/services/foo-service";

// @ts-expect-error @rehearsal TODO TS2307: Cannot find module 'services/moo/moo' or its corresponding type declarations.
import type MooService from "services/moo/moo";
import type GooService from "services/goo";
import type BooService from "boo/services/boo-service";
import Component from "@glimmer/component";
import { inject as service } from "@ember/service";

export default class SomeComponent extends Component {
  @service("foo@foo-service")
  declare fooService: FooService;

  @service("boo-service")
  declare booService: BooService;

  @service
  declare gooService: GooService;

  @service
  declare mooService: MooService;

  // Has to be fixes, but no additional import statement added
  @service("boo-service")
  declare secondBooService: BooService;

  // @ts-expect-error @rehearsal TODO TS7008: Member 'nonQualified' implicitly has an 'any' type.
  @service("non-qualified") nonQualified;
}
`;

      expectFile(outputs[0]).toEqual(expected);
    });

    test('previously migrated .gts', async () => {
      await project.write();

      const [inputs, outputs] = prepareInputFiles(project, ['already-migrated.gjs']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });
  });

  describe('with addon service', () => {
    let project: Project;
    let reporter: Reporter;

    beforeEach(async () => {
      project = Project.fromDir(projectPath, { linkDeps: true, linkDevDeps: true });

      reporter = new Reporter({
        tsVersion: '',
        projectName: '@rehearsal/test',
        projectRootDir: project.baseDir,
        commandName: '@rehearsal/fix',
      });

      const testAddon = project.addDependency('test-addon', '0.0.0');
      testAddon.pkg.keywords = ['ember-addon'];
      testAddon.pkg.main = 'index.ts';
      testAddon.pkg.types = 'index.d.ts';
      testAddon.files = {
        'index.ts': `module.exports = {
          moduleName() {
            return 'my-addon'
          }
        }`,
        services: {
          'foo.ts': `module.exports = {
            go() {
              return 'go';
            },
          };
          `,
          'foo.d.ts': `interface Foo {
            go(): string;
          }

          export default Foo;
          `,
        },
      };

      await project.write();
    });

    afterEach(() => {
      project.dispose();
    });

    test('.gts', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['with-addon-service.gts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('.ts', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['with-addon-service.ts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });
  });
});
