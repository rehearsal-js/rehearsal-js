import { readFileSync } from 'node:fs';
import path, { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Project } from 'fixturify-project';
import { type Report, Reporter } from '@rehearsal/reporter';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { getExcludePatterns } from '@rehearsal/migration-graph';
import { ReportItemType } from '@rehearsal/reporter';
import { migrate, MigrateInput, resolveIgnoredPaths } from '../src/migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ember project
const projectPath = resolve(__dirname, 'fixtures', 'project');

/**
 * Utility method for finding a targted piece of content using a sarif location.
 * Sarif location values start at 1
 *
 * @param content string
 * @param loc nodeLocation within the content we want to target
 * @returns the target content at loc
 */
function getContentAtLocation(
  content: string,
  loc?: { startLine: number; startColumn: number; endLine: number; endColumn: number }
): string {
  if (!loc) {
    return '';
  }

  // The start/end values start at 1
  const { startColumn, startLine, endColumn, endLine } = loc;

  const lines = content.split('\n');
  const affected = lines.slice(startLine - 1, endLine);

  // Trim off after endColumn first
  const lastIndex = affected.length - 1;
  affected[lastIndex] = affected[lastIndex].substring(0, endColumn - 1);

  // Trim of before startColumn
  affected[0] = affected[0].substring(startColumn - 1);
  return affected.join('\n');
}

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

function expectFile(filePath: string, message?: string): Vi.Assertion<string> {
  return expect(readFileSync(filePath, 'utf-8'), message);
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
      });
    });

    afterEach(() => {
      project.dispose();
    });

    test('with bare template', async () => {
      // since we are no longer doing a file conversion input and output are the same
      const [inputs, outputs] = prepareInputFiles(project, ['gts/template-only.gts']);

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
      const [inputs, outputs] = prepareInputFiles(project, ['gts/template-only-variable.gts']);

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
      const [inputs, outputs] = prepareInputFiles(project, ['gts/with-class.gts']);

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
      const [inputs, outputs] = prepareInputFiles(project, ['gts/with-non-qualified-service.gts']);

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

      expectFile(outputs[0]).contains('class TestWithNonQualifiedService');
      expectFile(outputs[0]).toMatchSnapshot();

      reporter.printReport(project.baseDir);
    });

    test('with service map', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['gts/with-mapped-service.gts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).contains('class TestWithMappedServiceGts');
      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('with qualified service', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['gts/with-qualified-service.gts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }
      expectFile(outputs[0]).contains('class TestWithQualifiedServiceGts');
      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('when missing a local prop', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['gts/missing-local-prop.gts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }
      expectFile(outputs[0]).contains('class TestMissingLocalPropGts');
      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('with errors', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['gts/with-errors.gts']);

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

      reporter.printReport(project.baseDir);

      const jsonReport = resolve(project.baseDir, 'rehearsal-report.json');
      const report = JSON.parse(readFileSync(jsonReport).toString()) as Report;

      const reportedItems = report.items.filter(
        (item) =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          item.analysisTarget.includes('src/gts/with-errors.gts') &&
          item.type == ReportItemType.glint
      );

      // Should expect a specific list of glint errors
      expect(reportedItems.length).toBeGreaterThan(0);

      // Ensure reported item points to correct line in report
      const affected = getContentAtLocation(
        readFileSync(outputs[0], 'utf-8'),
        reportedItems[0]?.nodeLocation
      );

      expect(affected, 'the reportItem.nodeLocation should match the arg').toEqual('age');
    });

    test('with more errors', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['gts/with-more-errors.gts']);

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
      const [inputs, outputs] = prepareInputFiles(project, ['gts/with-no-errors.gts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).contains('class TestGjsNoErrors');
      expectFile(outputs[0]).toMatchSnapshot();
    });

    describe('component signature codefix', () => {
      test('with-typedef for component signature interface', async () => {
        const [inputs, outputs] = prepareInputFiles(project, ['gts/signatures/with-typedef.gts']);

        const input: MigrateInput = {
          projectRootDir: project.baseDir,
          packageDir: project.baseDir,
          filesToMigrate: inputs,
          reporter,
          mode: 'drain',
        };

        for await (const _ of migrate(input)) {
          // no ops
        }

        expectFile(outputs[0]).toMatchSnapshot();

        expectFile(outputs[0]).contains('interface RepeatSignature');
        expectFile(outputs[0]).contains('export class Repeat extends Component<RepeatSignature>');

        expectFile(outputs[0]).contains('interface MyComponentSignature');
        expectFile(outputs[0]).contains(
          'class MyComponent extends Component<MyComponentSignature>'
        );

        expectFile(outputs[0]).contains('interface InterfaceFromCommentSignature');
        expectFile(outputs[0]).contains('interface InterfaceFromCommentArgs');
        expectFile(outputs[0]).contains(
          'class Something extends Component<InterfaceFromCommentSignature> '
        );
      });

      test('add component signature interface', async () => {
        const [inputs, outputs] = prepareInputFiles(project, [
          'gts/signatures/with-missing-interface.gts',
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

        expectFile(outputs[0]).contains('interface WithMissingInterfaceSignature');
        expectFile(outputs[0]).contains(
          'export default class WithMissingInterface extends Component<WithMissingInterfaceSignature>'
        );
        expectFile(outputs[0]).toMatchSnapshot();
      });

      test('adds `Args` property to component signature interface', async () => {
        const [inputs, outputs] = prepareInputFiles(project, [
          'gts/signatures/with-missing-args-property.gts',
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

        expectFile(outputs[0]).contains('class WithMissingProperty');
        expectFile(outputs[0]).toMatchSnapshot();
      });

      test('adds missing args to Args to component signature interface', async () => {
        const [inputs, outputs] = prepareInputFiles(project, [
          'gts/signatures/with-missing-args.gts',
        ]);

        const input: MigrateInput = {
          projectRootDir: project.baseDir,
          packageDir: project.baseDir,
          filesToMigrate: inputs,
          reporter,
          mode: 'drain',
        };

        for await (const _ of migrate(input)) {
          // no ops
        }

        expectFile(
          outputs[0],
          'Expecting any for both args as they were both not defined on the interface'
        ).contains(`interface FooArgs {\n  snack: any;\n  age: any;\n}`);
        expectFile(outputs[0], 'Expecting any for snack arg because it was not defined').contains(
          `interface BarArgs {\n  snack: any;\n  age: number;\n}`
        );
        expectFile(
          outputs[0],
          'Expecting any for both args as they were both not defined on the interface'
        ).contains(`export interface BazSignature {\n  Args: { snack: any; age: any };\n}`);

        expectFile(outputs[0]).toMatchSnapshot();
      });

      test('mode: drain should apply all code fixes', async () => {
        const [inputs, outputs] = prepareInputFiles(project, [
          'gts/signatures/with-missing-interface.gts',
        ]);

        const input: MigrateInput = {
          projectRootDir: project.baseDir,
          packageDir: project.baseDir,
          filesToMigrate: inputs,
          reporter,
          mode: 'drain',
        };

        for await (const _ of migrate(input)) {
          // no ops
        }

        expectFile(outputs[0]).contains('interface WithMissingInterfaceSignature');
        expectFile(outputs[0]).contains(
          'export default class WithMissingInterface extends Component<WithMissingInterfaceSignature>'
        );
        expectFile(outputs[0]).toMatchSnapshot();
      });
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
      });
    });

    afterEach(() => {
      project.dispose();
    });

    test('template only', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['template-only.hbs']);

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
    });

    test.todo('with errors', async () => {
      // This test needs investigated why the errors are no longer being reported
      const [inputs, outputs] = prepareInputFiles(project, ['with-errors.hbs', 'with-errors.ts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(
        outputs[0],
        'hbs should not have any added @glint-expect-error directives'
      ).not.contains('{{! @glint-expect-error');

      expectFile(outputs[0]).toMatchSnapshot();
      expectFile(outputs[1]).toMatchSnapshot();

      reporter.printReport(project.baseDir);

      const jsonReport = resolve(project.baseDir, 'rehearsal-report.json');
      const report = JSON.parse(readFileSync(jsonReport).toString()) as Report;

      const reportedItems = report.items.filter(
        (item) =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          item.analysisTarget.includes('src/with-errors.hbs') && item.type == ReportItemType.glint
      );

      // Should expect a specific list of glint errors
      expect(reportedItems.length).toBeGreaterThan(0);

      // Ensure reported item points to correct line in report
      const affected = getContentAtLocation(
        readFileSync(outputs[0], 'utf-8'),
        reportedItems[0]?.nodeLocation
      );
      expect(affected, 'the reportItem.nodeLocation should match the arg').toEqual('name');
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

    test('with qualified service in subpackage with included types', async () => {
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

    test('with qualified service in subpackage without included types', async () => {
      await project.write();

      const [inputs, outputs] = prepareInputFiles(
        project,
        ['with-qualified-service.ts'],
        'packages/boo'
      );

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: resolve(project.baseDir, 'packages/boo'),
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('subpackage without tsconfig.json', async () => {
      await project.write();

      const [inputs, outputs] = prepareInputFiles(
        project,
        ['with-qualified-service.ts'],
        'packages/moo'
      );

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: resolve(project.baseDir, 'packages/moo'),
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('typedef', async () => {
      await project.write();

      const [inputs, outputs] = prepareInputFiles(project, ['typedef.ts']);

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

  describe('.ts, .gts', () => {
    let project: Project;
    let reporter: Reporter;

    beforeEach(() => {
      project = Project.fromDir(projectPath, { linkDeps: true, linkDevDeps: true });

      reporter = new Reporter({
        tsVersion: '',
        projectName: '@rehearsal/test',
        projectRootDir: project.baseDir,
      });
    });

    afterEach(() => {
      project.dispose();
    });

    test('resolveIgnoredPaths()', async () => {
      await project.write();

      const ignoredPaths = resolveIgnoredPaths(
        ['packages/**/*', 'src/gts/with-class.gts'],
        project.baseDir,
        getExcludePatterns
      );
      const sanitizedPaths = ignoredPaths.map((path) => {
        return cleanOutput(path, project.baseDir);
      });

      expect(ignoredPaths.length).toBe(9);
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

      const somePackageFromOrg = project.addDependency('@my-org/some-ember-addon', '0.0.0');
      somePackageFromOrg.pkg.keywords = ['ember-addon'];
      somePackageFromOrg.pkg.main = 'index.ts';
      somePackageFromOrg.pkg.types = 'index.d.ts';
      somePackageFromOrg.files = {
        'index.ts': `module.exports = {
          moduleName() {
          return 'some-ember-addon'
          }
        }`,
        services: {
          'locale.ts': `
import Service from '@ember/service';

export default class LocaleService extends Service {
  current() {
    return 'en-US';
  }
}
          `,
          'locale.d.ts': `interface LocaleService {
            current(): string;
          }

          export default LocaleService;
          `,
        },
      };

      await project.write();
    });

    afterEach(() => {
      project.dispose();
    });

    test('.gts', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['gts/with-addon-service.gts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).contains('SomeGtsComponent');
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
      expectFile(outputs[0]).contains('SomeTsComponent');
      expectFile(outputs[0]).toMatchSnapshot();
    });
  });

  describe('EXPERIMENTAL_MODES, GlintService', () => {
    let project: Project;
    let reporter: Reporter;

    const projectPath = resolve(__dirname, 'fixtures', 'project');

    beforeEach(async () => {
      project = Project.fromDir(projectPath, { linkDeps: true, linkDevDeps: true });

      reporter = new Reporter({
        tsVersion: '',
        projectName: '@rehearsal/test',
        projectRootDir: project.baseDir,
      });

      await project.write();
    });

    afterEach(() => {
      project.dispose();
    });

    test('mode: single-pass', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['foo.ts']);

      const singlePass: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
        mode: 'single-pass',
      };

      for await (const _ of migrate(singlePass)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('mode: drain', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['foo.ts']);

      const drainInput: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
        mode: 'drain',
      };

      for await (const _ of migrate(drainInput)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });
  });

  describe('RehearsalService', () => {
    let project: Project;
    let reporter: Reporter;

    const projectPath = resolve(__dirname, 'fixtures', 'project-basic');

    beforeEach(async () => {
      project = Project.fromDir(projectPath, { linkDeps: true, linkDevDeps: true });

      reporter = new Reporter({
        tsVersion: '',
        projectName: '@rehearsal/test',
        projectRootDir: project.baseDir,
      });

      await project.write();
    });

    afterEach(() => {
      project.dispose();
    });

    test('EXPERIMENTAL_MODES mode: single-pass', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['foo.ts']);

      const singlePass: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
        mode: 'single-pass',
      };

      for await (const _ of migrate(singlePass)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('EXPERIMENTAL_MODES mode: drain', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['foo.ts']);

      const drainInput: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
        mode: 'drain',
      };

      for await (const _ of migrate(drainInput)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('typedef', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['typedef.ts']);

      const drainInput: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
        mode: 'drain',
      };

      for await (const _ of migrate(drainInput)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('more errors', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['with-more-errors.ts']);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
        mode: 'drain',
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('import type after infer it from hierarchy', async () => {
      const [inputs, outputs] = prepareInputFiles(project, [
        'basic.animal.ts',
        'basic.food.ts',
        'basic.index.ts',
      ]);

      const input: MigrateInput = {
        projectRootDir: project.baseDir,
        packageDir: project.baseDir,
        filesToMigrate: inputs,
        reporter,
        mode: 'drain',
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[2]).contains('import { Food }');
      expectFile(outputs[2]).contains('./basic.food');
      expectFile(outputs[2]).contains('say(message: string): string');
      expectFile(outputs[2]).contains('feed(food: Food, quantity: number): boolean');

      expectFile(outputs[0]).toMatchSnapshot();
      expectFile(outputs[1]).toMatchSnapshot();
      expectFile(outputs[2]).toMatchSnapshot();
    });
  });
});
