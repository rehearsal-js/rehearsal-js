import { readFileSync } from 'node:fs';
import path, { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Project } from 'fixturify-project';
import { Reporter } from '@rehearsal/reporter';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { MigrateInput, migrate } from '../src/migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

function prepareInputFiles(project: Project, files: string[] = ['index.js']): string[][] {
  const inputs = files.map((file) => {
    return resolve(project.baseDir, 'src', file);
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

describe('migrate', () => {
  describe('.gjs', () => {
    let project: Project;
    let reporter: Reporter;

    beforeEach(async () => {
      project = Project.fromDir(projectPath, { linkDeps: true, linkDevDeps: true });

      delete project.files['index.js'];

      await project.write();

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

    test('with bare template', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['template-only.gjs']);

      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFiles: inputs,
        entrypoint: '',
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      const expected = `<template>
  {{! @glint-expect-error @rehearsal TODO TS2339: Property 'name' does not exist on type '{}'. }}
  <span>Hello, {{@name}}!</span>

  {{! @glint-expect-error @rehearsal TODO TS2339: Property 'someCondition' does not exist on type '{}'. }}
  {{#if @someCondition}}
    <div>true!</div>
  {{/if}}
</template>
`;

      expectFile(outputs[0]).toEqual(expected);
    });

    test('with template assigned to variable', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['template-only-variable.gjs']);

      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFiles: inputs,
        entrypoint: '',
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      const expected = `const Hello = <template>
  {{! @glint-expect-error @rehearsal TODO TS2339: Property 'name' does not exist on type '{}'. }}
  <span>Hello, {{@name}}!</span>
</template>
`;

      expectFile(outputs[0]).toEqual(expected);
    });

    test('with class', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['with-class.gjs']);

      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFiles: inputs,
        entrypoint: '',
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      const expected = `import Component from '@glimmer/component';

export default class Hello extends Component {
  name = 'world';

  <template>
    {{! @glint-expect-error @rehearsal TODO TS2339: Property 'age' does not exist on type '{}'. }}
    <span>Hello, I am {{this.name}} and I am {{@age}} years old!</span>
  </template>
}
`;

      expectFile(outputs[0]).toEqual(expected);
    });

    test('with service', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['with-service.gjs']);

      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFiles: inputs,
        entrypoint: '',
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }
      const expected = `import type AuthenticatedUser from 'authentication/services/authenticated-user';
import Component from '@glimmer/component';
import { inject as service } from '@ember/service';

export default class Hello extends Component {
  @service("authentication@authenticated-user")
declare authenticatedUser: AuthenticatedUser;

  name = 'world';

  <template>
    {{! @glint-expect-error @rehearsal TODO TS2339: Property 'age' does not exist on type '{}'. }}
    <span>Hello, I am {{this.name}} and I am {{@age}} years old!</span>
  </template>
}
`;

      expectFile(outputs[0]).toEqual(expected);
    });

    test('when missing a local prop', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['missing-local-prop.gjs']);

      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFiles: inputs,
        entrypoint: '',
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      const expected = `import Component from '@glimmer/component';

export default class Hello extends Component {
  <template>
    {{! @glint-expect-error @rehearsal TODO TS2339: Property 'name' does not exist on type 'Hello'. }}
    {{! @glint-expect-error @rehearsal TODO TS2339: Property 'age' does not exist on type '{}'. }}
    <span>Hello, I am {{this.name}} and I am {{@age}} years old!</span>
  </template>
}
`;

      expectFile(outputs[0]).toEqual(expected);
    });

    test('still migrates the file if there are no errors', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['gjs-no-errors.gjs']);

      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFiles: inputs,
        entrypoint: '',
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      const expected = `import Component from '@glimmer/component';

export default class Hello extends Component {
  name = 'world';

  <template>
    <span>Hello, I am {{this.name}}!</span>
  </template>
}
`;

      expectFile(outputs[0]).toEqual(expected);
    });
  });

  describe('.hbs', () => {
    let project: Project;
    let reporter: Reporter;

    beforeEach(async () => {
      project = Project.fromDir(projectPath, { linkDeps: true, linkDevDeps: true });

      delete project.files['index.js'];

      await project.write();

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

    test('simple class', async () => {
      const [inputs, outputs] = prepareInputFiles(project, [
        'missing-local-prop.hbs',
        'missing-local-prop.js',
      ]);

      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFiles: inputs,
        entrypoint: '',
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      expectFile(outputs[0]).matchSnapshot();
      expectFile(outputs[1]).matchSnapshot();
    });

    test('more involved class', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['salutation.hbs', 'salutation.js']);

      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFiles: inputs,
        entrypoint: '',
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      const expectedTs = `import Component from "@glimmer/component";
import { inject as service } from "@ember/service";

export default class Salutation extends Component {
  @service locale: { current: () => string } | undefined;
  get name() {
    /* @ts-expect-error @rehearsal TODO TS2532: Object is possibly 'undefined'. */
    if (this.locale.current() == "en-US") {
      return "Bob";
    }
    return "Unknown";
  }
}
`;

      const expectedHbs = `<span>Hello {{this.name}}</span>
`;

      expectFile(outputs[0]).toEqual(expectedHbs);
      expectFile(outputs[1]).toEqual(expectedTs);
    });
  });

  describe('.js', () => {
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

    test('class with missing prop', async () => {
      project.mergeFiles({
        src: {
          'foo.js': `class Foo {
  hello() {
    return this.name;
  }
}
`,
        },
      });

      await project.write();

      const [inputs, outputs] = prepareInputFiles(project, ['foo.js']);

      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFiles: inputs,
        entrypoint: '',
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      const expected = `class Foo {
  hello() {
    /* @ts-expect-error @rehearsal TODO TS2339: Property 'name' does not exist on type 'Foo'. */
    return this.name;
  }
}
`;

      expectFile(outputs[0]).toEqual(expected);
    });

    test('glimmerx inline hbs', async () => {
      await project.write();

      const [inputs, outputs] = prepareInputFiles(project, ['glimmerx-component.js']);
      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFiles: inputs,
        entrypoint: '',
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

      const [inputs, outputs] = prepareInputFiles(project, ['ember-integration-test.js']);

      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFiles: inputs,
        entrypoint: '',
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
    {{! @glint-expect-error @rehearsal TODO TS2339: Property 'styles' does not exist on type 'void'. }}
    await render(hbs\`<ul data-test-el class="{{this.styles}}">foo</ul>\`);

    this.set("styles", "foo");
    assert.dom("[data-test-el]").hasClass("some-class", "has the border class");

    this.set("styles", "foo");
    assert.dom("[data-test-el]").hasClass("some-class", "has the border class");

    this.set("styles", "foo");
    assert.dom("[data-test-el]").hasClass("some-class", "has the border class");
  });
});
`;

      expectFile(outputs[0]).toEqual(expected);
    });

    test('with service', async () => {
      await project.write();

      const [inputs, outputs] = prepareInputFiles(project, ['with-service.js']);

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
  });

  describe('with addon service', () => {
    let project: Project;
    let reporter: Reporter;

    const expectedTsConfig = JSON.stringify({
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
    });

    beforeEach(async () => {
      project = Project.fromDir(projectPath, { linkDeps: true, linkDevDeps: true });

      reporter = new Reporter({
        tsVersion: '',
        projectName: '@rehearsal/test',
        basePath: project.baseDir,
        commandName: '@rehearsal/migrate',
      });

      const testAddon = project.addDependency('test-addon', '0.0.0');
      testAddon.pkg.keywords = ['ember-addon'];
      testAddon.pkg.main = 'index.js';
      testAddon.pkg.types = 'index.d.ts';
      testAddon.files = {
        'index.js': `module.exports = {
          moduleName() {
            return 'my-addon'
          }
        }`,
        services: {
          'foo.js': `module.exports = {
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

    test('.gjs', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['with-addon-service.gjs']);

      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFiles: inputs,
        entrypoint: '',
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      const expected = `import type Foo from 'my-addon/services/foo';
import Component from '@glimmer/component';
import { inject as service } from '@ember/service';

export default class SomeComponent extends Component {
  @service("my-addon@foo")
declare foo: Foo;

  <template>Hello</template>
}
`;

      expectFile(path.join(project.baseDir, 'tsconfig.json')).toEqual(expectedTsConfig);
      expectFile(outputs[0]).toEqual(expected);
    });

    test('.js', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['with-addon-service.js']);

      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFiles: inputs,
        entrypoint: '',
        reporter,
      };

      for await (const _ of migrate(input)) {
        // no ops
      }

      const expected = `import type Foo from "my-addon/services/foo";
import Component from "@glimmer/component";
import { inject as service } from "@ember/service";

export default class SomeComponent extends Component {
  @service("my-addon@foo")
  declare foo: Foo;
}
`;

      expectFile(path.join(project.baseDir, 'tsconfig.json')).toEqual(expectedTsConfig);
      expectFile(outputs[0]).toEqual(expected);
    });
  });
});
