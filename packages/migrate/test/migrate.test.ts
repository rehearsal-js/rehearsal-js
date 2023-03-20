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

      await migrate(input);

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

      await migrate(input);

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

      await migrate(input);

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

    test('when missing a local prop', async () => {
      const [inputs, outputs] = prepareInputFiles(project, ['missing-local-prop.gjs']);

      const input: MigrateInput = {
        basePath: project.baseDir,
        sourceFiles: inputs,
        entrypoint: '',
        reporter,
      };

      await migrate(input);

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

      await migrate(input);

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

    test('it works', async () => {
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

      await migrate(input);

      const expectedTs = `import Component from '@glimmer/component';

export default class Foo extends Component {}
`;

      const expectedHbs = `{{! @glint-expect-error @rehearsal TODO TS2339: Property 'name' does not exist on type 'Foo'. }}
{{! @glint-expect-error @rehearsal TODO TS2339: Property 'age' does not exist on type '{}'. }}
<span>Hello, I am {{this.name}} and I am {{@age}} years old!</span>
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

      await migrate(input);

      const expected = `class Foo {
  hello() {
/* @ts-expect-error @rehearsal TODO TS2339: Property 'name' does not exist on type 'Foo'. */
    return this.name;
  }
}
`;

      expectFile(outputs[0]).toEqual(expected);
    });
  });
});
