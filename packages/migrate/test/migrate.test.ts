import { readFileSync } from 'node:fs';
import path, { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Project } from 'fixturify-project';
import { type Report, type Location, Reporter } from '@rehearsal/reporter';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { migrate, MigrateInput } from '../src/migrate.js';

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

const extLookup = {
  '.js': '.ts',
  '.gjs': '.gts',
  '.gts': '.gts',
  '.hbs': '.hbs',
  '.ts': '.ts',
  '.gts': '.gts',
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

function getStringAtLocation(filePath: string, location: Location): string {
  const contents = readFileSync(filePath, 'utf-8');
  const lines = contents.split('\n');

  return lines[location.startLine].substring(location.startColumn - 1, location.endColumn - 1);
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
        basePath: project.baseDir,
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
        basePath: project.baseDir,
        sourceFilesAbs: inputs,
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
        basePath: project.baseDir,
        sourceFilesAbs: inputs,
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
        basePath: project.baseDir,
        sourceFilesAbs: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('with non-qualified service', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['with-non-qualified-service.gts']);

      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFilesAbs: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).toMatchSnapshot();

      reporter.printReport(project.baseDir);

      const jsonReport = resolve(project.baseDir, 'rehearsal-report.json');
      const report = JSON.parse(readFileSync(jsonReport).toString()) as Report;

      const reportedItems = report.items.filter((item) =>
        item.analysisTarget.includes('with-non-qualified-service.gts')
      );

      expect(getStringAtLocation(outputs[0], report.items[0].nodeLocation as Location)).toEqual(
        'authenticatedUser'
      );

      expect(report.summary[0].basePath).toMatch(project.baseDir);
      expect(getStringAtLocation(outputs[0], reportedItems[0].nodeLocation as Location)).toEqual(
        'authenticatedUser'
      );
      expect(getStringAtLocation(outputs[0], reportedItems[1].nodeLocation as Location)).toEqual(
        'age'
      );
    });

    test('with service map', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['with-mapped-service.gts']);

      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFilesAbs: inputs,
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
        basePath: project.baseDir,
        sourceFilesAbs: inputs,
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
        basePath: project.baseDir,
        sourceFilesAbs: inputs,
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
        basePath: project.baseDir,
        sourceFilesAbs: inputs,
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
        basePath: project.baseDir,
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
        basePath: project.baseDir,
        sourceFilesAbs: inputs,
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
        basePath: project.baseDir,
        sourceFilesAbs: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      const expectedTs = `import Component from "@glimmer/component";
import { inject as service } from "@ember/service";

export default class Salutation extends Component {
  // @ts-expect-error @rehearsal TODO TS2564: Property 'locale' has no initializer and is not definitely assigned in the constructor.
  @service locale: { current: () => string };
  get name() {
    if (this.locale.current() == "en-US") {
      return "Bob";
    }
    return "Unknown";
  }
}
`;

      const expectedHbs = `<span>Hello {{this.name}}</span>`;

      expectFile(outputs[0]).toEqual(expectedHbs);
      expectFile(outputs[1]).toEqual(expectedTs);

      reporter.printReport(project.baseDir);

      const jsonReport = resolve(project.baseDir, 'rehearsal-report.json');
      const report = JSON.parse(readFileSync(jsonReport).toString()) as Report;
      const reportedItems = report.items.filter((item) =>
        item.analysisTarget.includes('src/salutation.ts')
      );
      expect(report.summary[0].basePath).toMatch(project.baseDir);
      expect(report.items).toHaveLength(2);
      expect(report.items[0].analysisTarget).toEqual('src/salutation.ts');
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
        basePath: project.baseDir,
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
        basePath: project.baseDir,
        sourceFilesAbs: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      const expected = `class Foo {
  hello() {
    // @ts-expect-error @rehearsal TODO TS2339: Property 'name' does not exist on type 'Foo'.
    return this.name;
  }
}
`;

      expectFile(outputs[0]).toEqual(expected);
    });

    test('glimmerx inline hbs', async () => {
      await project.write();

      const [inputs, outputs] = prepareInputFiles(project, ['glimmerx-component.ts']);
      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFilesAbs: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      const expected = `import Component, { hbs } from "@glimmerx/component";

export default class HelloWorld extends Component {
  name = "world";

  static template = hbs\`
  {{! @glint-expect-error @rehearsal TODO TS2339: Property 'age' does not exist on type '{}'. }}
  <span>Hello, I am {{this.name}} and I am {{@age}} years old!</span>
\`;
}
`;
      expectFile(outputs[0]).toEqual(expected);
    });

    test('inline hbs in tests', async () => {
      await project.write();

      const [inputs, outputs] = prepareInputFiles(project, ['ember-integration-test.ts']);

      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFilesAbs: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      const expected = `import "qunit-dom";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";

module("Integration | Helper | grid-list", function (hooks) {
  setupRenderingTest(hooks);

  test("it sets and changes the columns classes", async function (assert) {
    this.set("styles", "foo");
    // @ts-expect-error @rehearsal TODO TS2339: Property 'styles' does not exist on type 'void'.
    await render(hbs\`<ul data-test-el class="{{this.styles}}">foo</ul>\`);

    this.set("styles", "foo");
    assert.dom("[data-test-el]").hasClass("some-class", "has the border class");

    await render(hbs\`<Map
      {{! @glint-expect-error @rehearsal TODO TS2339: Property 'lat' does not exist on type 'void'. }}
      @lat={{this.lat}}
      {{! @glint-expect-error @rehearsal TODO TS2339: Property 'lng' does not exist on type 'void'. }}
      @lng={{this.lng}}
      {{! @glint-expect-error @rehearsal TODO TS2339: Property 'zoom' does not exist on type 'void'. }}
      @zoom={{this.zoom}}
      {{! @glint-expect-error @rehearsal TODO TS2339: Property 'width' does not exist on type 'void'. }}
      @width={{this.width}}
      {{! @glint-expect-error @rehearsal TODO TS2339: Property 'height' does not exist on type 'void'. }}
      @height={{this.height}}
    />\`);

    this.set("styles", "foo");
    assert.dom("[data-test-el]").hasClass("some-class", "has the border class");

    this.set("styles", "foo");
    assert.dom("[data-test-el]").hasClass("some-class", "has the border class");
  });
});
`;

      expectFile(outputs[0]).toEqual(expected);
    });

    test('with non-qualified service', async () => {
      await project.write();

      const [inputs, outputs] = prepareInputFiles(project, ['with-non-qualified-service.ts']);

      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFilesAbs: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      const expected = `import Component from "@glimmer/component";
import { inject as service } from "@ember/service";

export default class SomeComponent extends Component {
  // @ts-expect-error @rehearsal TODO TS7008: Member 'authenticatedUser' implicitly has an 'any' type.
  @service("authenticated-user") authenticatedUser;
}
`;

      expectFile(outputs[0]).toEqual(expected);
    });

    test('with service map', async () => {
      await project.write();

      const [inputs, outputs] = prepareInputFiles(project, ['with-mapped-service.ts']);

      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFilesAbs: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      const expected = `// @ts-expect-error @rehearsal TODO TS2307: Cannot find module 'services/moo/moo' or its corresponding type declarations.
import type MooService from "services/moo/moo";
import type GooService from "services/goo";
import type BooService from "boo/services/boo-service";
import Component from "@glimmer/component";
import { inject as service } from "@ember/service";

export default class SomeComponent extends Component {
  @service("boo-service")
  declare booService: BooService;

  @service
  declare gooService: GooService;

  @service
  declare mooService: MooService;
}
`;

      expectFile(outputs[0]).toEqual(expected);
    });

    test('with qualified service', async () => {
      await project.write();

      const [inputs, outputs] = prepareInputFiles(project, ['with-qualified-service.ts']);

      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFilesAbs: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      const expected = `import type FooService from "foo/services/foo-service";
import type AuthenticatedUser from "authentication/services/authenticated-user";
import Component from "@glimmer/component";
import { inject as service } from "@ember/service";

export default class SomeComponent extends Component {
  @service("authentication@authenticated-user")
  declare authenticatedUser: AuthenticatedUser;

  @service("foo@foo-service")
  declare otherProp: FooService;
}
`;

      expectFile(outputs[0]).toEqual(expected);
    });

    test('with qualified service in subpackage', async () => {
      await project.write();

      const [inputs, outputs] = prepareInputFiles(
        project,
        ['with-qualified-service.ts'],
        'packages/foo'
      );

      const input: MigrateInput = {
        basePath: resolve(project.baseDir, 'packages/foo'),
        sourceFilesAbs: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      //! rehearsal should be able to find the FooService; currently broken in fix refactor
//       const expected = `import type FooService from "foo/services/foo-service";
// import type AuthenticatedUser from "authentication/services/authenticated-user";
// import Component from "@glimmer/component";
// import { inject as service } from "@ember/service";

// export default class SomeComponent extends Component {
//   @service("authentication@authenticated-user")
//   declare authenticatedUser: AuthenticatedUser;

//   @service("foo@foo-service")
//   declare otherProp: FooService;
// }
// `;
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
        basePath: project.baseDir,
        commandName: '@rehearsal/migrate',
      });
    });

    afterEach(() => {
      project.dispose();
    });

    test('previously migrated .ts', async () => {
      await project.write();

      const [inputs, outputs] = prepareInputFiles(project, ['already-migrated-js-to.ts']);

      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFiles: inputs,
        entrypoint: '',
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
        basePath: project.baseDir,
        sourceFiles: inputs,
        entrypoint: '',
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      const expected =
        `import type FooService from "foo/services/foo-service";


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

` +
        `  ` +
        `
  // @ts-expect-error @rehearsal TODO TS7008: Member 'nonQualified' implicitly has an 'any' type.
  @service('non-qualified') nonQualified;

  <template>
    <span>Hello, I am human, and I am 10 years old!</span>
  </template>
}
`;

      expectFile(outputs[0]).toEqual(expected);
    });
  });

  describe('with addon service', () => {
    let project: Project;
    let reporter: Reporter;

    const expectedTsConfig = JSON.stringify(
      {
        $schema: 'http://json.schemastore.org/tsconfig',
        compilerOptions: {
          allowSyntheticDefaultImports: true,
          composite: true,
          declaration: true,
          declarationMap: true,
          esModuleInterop: true,
          experimentalDecorators: true,
          module: 'commonjs',
          moduleResolution: 'node',
          newLine: 'LF',
          noImplicitAny: true,
          noImplicitReturns: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          resolveJsonModule: true,
          sourceMap: true,
          strict: true,
          target: 'es2017',
          checkJs: true,
          paths: {
            'my-addon': ['node_modules/test-addon'],
            'my-addon/*': ['node_modules/test-addon/*'],
          },
        },
        glint: {
          environment: ['ember-loose', 'ember-template-imports', 'glimmerx'],
          checkStandaloneTemplates: true,
        },
      },
      null,
      2
    );

    beforeEach(async () => {
      project = Project.fromDir(projectPath, { linkDeps: true, linkDevDeps: true });

      reporter = new Reporter({
        tsVersion: '',
        projectName: '@rehearsal/test',
        basePath: project.baseDir,
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
        basePath: project.baseDir,
        sourceFilesAbs: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

//       const expected = `import type Foo from 'my-addon/services/foo';
// import Component from '@glimmer/component';
// import { inject as service } from '@ember/service';

// export default class SomeComponent extends Component {
//   @service("my-addon@foo")
// declare foo: Foo;

//   <template>Hello</template>
// }
// `;

      expectFile(path.join(project.baseDir, 'tsconfig.json')).toEqual(expectedTsConfig);
      expectFile(outputs[0]).toMatchSnapshot();
    });

    test('.ts', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['with-addon-service.ts']);

      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFilesAbs: inputs,
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

//       const expected = `import type Foo from "my-addon/services/foo";
// import Component from "@glimmer/component";
// import { inject as service } from "@ember/service";

// export default class SomeComponent extends Component {
//   @service("my-addon@foo")
//   declare foo: Foo;
// }
// `;

      expectFile(path.join(project.baseDir, 'tsconfig.json')).toEqual(expectedTsConfig);
      expectFile(outputs[0]).toMatchSnapshot();
    });
  });
});
