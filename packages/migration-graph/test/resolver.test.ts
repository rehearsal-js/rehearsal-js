import { describe, beforeEach, expect, test, afterEach } from 'vitest';
import { Project } from 'fixturify-project';
import { Resolver } from '../src/resolver.js';
import { discoverServiceDependencies } from '../src/discover-services.js';
import { topSortFiles } from '../src/sort-graph.js';
import { PackageGraph } from '../src/project-graph.js';
import { generateDotLanguage } from '../src/dot.js';
import { generateJson } from '../src/json.js';

describe('Resolver', () => {
  let resolver: Resolver;
  let project: Project;

  beforeEach(async () => {
    project = new Project('package-a');
    project.files = {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          baseUrl: './',
        },
        references: [
          { path: './packages/package-a' },
          { path: './packages/package-b' },
          { path: './packages/package-c' },
        ],
      }),
      packages: {
        'package-a': {
          src: {
            'a.js': `
            import { b } from "./b.js";
            import { index } from './thing';
            export const a = "a";`,
            'b.js': `
            import { c } from './c.js';
            export const b = "b";
            `,
            'c.js': `
            import { a } from "./a.js";
            export const c = "c";`,
            thing: {
              'index.ts': `export const index = "index";`,
            },
          },
          'package.json': JSON.stringify({
            name: 'package-a',
          }),
          'tsconfig.json': JSON.stringify({
            extends: '../../tsconfig.json',
          }),
        },
        'package-b': {
          src: {
            'd.js': `
            import { b } from "package-a/b";
            import { e } from "./e.ts";
            const d = "d";`,
            'e.ts': `
            export const e = "e";
            `,
            'f.js': 'import { e } from "./e.js";\nexport const f = "f";',
          },
          'package.json': JSON.stringify({
            name: 'package-b',
            dependencies: {
              'package-a': '*',
            },
          }),
          'tsconfig.json': JSON.stringify({
            extends: '../../tsconfig.json',
            compilerOptions: {
              paths: {
                'package-a/*': ['./packages/package-a/src/*'],
              },
            },
          }),
        },
        'package-c': {
          src: {
            'g.gts': `
            import Component from "@glimmer/component";
            import { h } from './h.js';
            import { f } from 'package-b/f';

            export default class G extends Component {
              <template>{{@name}}</template>
            }
            `,
            'h.ts': `export const h = "h";`,
            'j.gjs': `
            import { h } from './h.js';
            import { f } from 'package-b/f';
            import Component from "@glimmer/component";
            import { inject as service } from "@ember/service";
            import K from './k.gjs';

            export default class J extends Component {
              @service('package-d@thing') thing;
              @service tracking;
              @service('nothing@not-found') nothing;
              <template>
                <K />
              </template>
            }
            `,
            'k.gjs': `
            import Component from "@glimmer/component";

            export default class K extends Component {
              <template>
                K
              </template>
            }
            `,
          },
          'package.json': JSON.stringify({
            name: 'package-c',
            dependencies: {
              'package-b': '*',
              'package-d': '*',
            },
          }),
          'tsconfig.json': JSON.stringify({
            extends: '../../tsconfig.json',
            compilerOptions: {
              paths: {
                'package-b/*': ['./packages/package-b/src/*'],
                'package-d/*': ['./packages/package-d/addon/*'],
              },
            },
          }),
        },
        'package-d': {
          addon: {
            services: {
              'thing.js': `
              import Service from "@ember/service";

              export class Thing extends Service {}
              `,

              'tracking.js': `
              import Service from "@ember/service";

              export class Tracking extends Service {}
              `,
            },
          },
          'package.json': JSON.stringify({
            name: '@company/package-d',
            dependencies: {
              'package-b': '*',
            },
          }),
          'tsconfig.json': JSON.stringify({
            extends: '../../tsconfig.json',
            compilerOptions: {
              paths: {
                'package-b/*': ['./packages/package-b/src/*'],
              },
            },
          }),
        },
        'package-e': {
          'dist-types': {
            src: {
              foo: {
                'index.d.ts': 'export declare const index: string;',
              },
            },
          },
          src: {
            '1.tsx': `
            import { two } from './2.mts';
            import { Three } from './3';
            import { index } from './foo';
            two;
            Three;
            index;
            `,
            '2.mts': `export const two = "two";`,
            '3.jsx': `
            import { b } from 'package-a/b';
            b;
            import { Four } from './4.jsx';
            export function Three() { return <div>Hello <Four /></div> }
            `,
            '4.jsx': `export function Four() { return <div>Hello</div> }`,
            foo: {
              'index.ts': `export const index = "index";`,
            },
          },
          'package.json': JSON.stringify({
            name: '@company/package-e',
            dependencies: {
              'package-b': '*',
            },
          }),
          'tsconfig.json': JSON.stringify({
            extends: '../../tsconfig.json',
            compilerOptions: {
              paths: {
                'package-e/*': ['./packages/package-e/src/*'],
                'package-a/*': ['./packages/package-a/src/*'],
              },
            },
          }),
        },
        'package-f': {
          unresolvable: {
            'index.js': `
            import config '../literal/never/exists/on-disk';
            import {index} from "package-e/foo"
            `,
          },
          src: {
            'index.mts': `import {index} from "package-e/foo"`,
          },
          'package.json': JSON.stringify({
            name: '@company/package-4',
            dependencies: {
              'package-e': '*',
            },
          }),
          'tsconfig.json': JSON.stringify({
            extends: '../../tsconfig.json',
            compilerOptions: {
              paths: {
                'package-e/*': ['./packages/package-e/dist-types/src/*'],
              },
            },
          }),
        },

        'with-externals-imports': {
          src: {
            'other.js': `
            import { addonWithTypes } from "with-types";
            import { get } from '@ember/object';
            export const other = "other";
            `,
            'index.mts': `
            import {index} from "package-e/foo"
            import {foo} from "my-external";
            import { addon } from "no-types";
            import { other } from './other';
            `,
          },
          'tsconfig.json': JSON.stringify({
            extends: '../../tsconfig.json',
            compilerOptions: {
              paths: {
                'package-e/*': ['./packages/package-e/dist-types/src/*'],
              },
            },
          }),

          'package.json': JSON.stringify({
            name: '@company/package-with-externals',
            dependencies: {
              'package-e': '*',
              'my-external': '*',
              'my-external-addon-no-types': '*',
              'my-external-with-types': '*',
              'ember-source': '*',
            },
          }),
          node_modules: {
            'ember-source': {
              lib: {
                'index.js': 'module.exports = "ember"',
              },
              dist: {
                packages: {
                  ember: {
                    'index.js': 'export const ember = "ember"',
                  },
                },
              },
              'package.json': JSON.stringify({
                name: 'ember-source',
                keywords: ['ember-addon'],
              }),
            },
            'my-external-addon-no-types': {
              addon: {
                'not-followed.js': `export default class NotFollowed {}`,
                'index.js': `
                import notFollowed from "./not-followed";
                export const addon = "addon";
                `,
              },
              'index.js': `module.exports = { name: "no-types" }`,
              'package.json': JSON.stringify({
                keywords: ['ember-addon'],
                name: 'my-external-addon-no-types',
                main: './index.js',
              }),
            },
            'my-external-with-types': {
              addon: {
                'index.ts': 'export const addonWithTypes = "addon";',
              },
              'index.js': `module.exports = { name: "with-types" }`,
              'package.json': JSON.stringify({
                keywords: ['ember-addon'],
                name: 'my-external-with-types',
                main: './index.js',
              }),
            },
            'my-external': {
              dist: {
                'index.js': 'export const foo = "foo";',
                'index.d.ts': 'export declare const foo: string;',
              },
              'package.json': JSON.stringify({
                name: 'my-external',
                types: './dist/index.d.ts',
                main: './dist/index.js',
              }),
            },
          },
        },

        'missing-imports': {
          src: {
            'index.mts': `import {index} from "package-e/foo"`,
          },
          'package.json': JSON.stringify({
            name: '@company/package-4',
            dependencies: {},
          }),
        },

        'parse-failure': {
          src: {
            'index.js': `
            import MDXComponents from '@theme/MDXComponents';
            function TokensHeader() {
              return (
                <section>
                  <H1>blah</H1>
                  <p>foo</p>
                </section>
              );
            }
            `,
          },
          'package.json': JSON.stringify({
            name: '@company/package-5',
            dependencies: {},
          }),
        },
      },
    };

    await project.write();

    resolver = new Resolver({ rootPath: project.baseDir, includeExternals: false });
    await resolver.load();
  });

  afterEach(() => {
    project.dispose();
  });

  test('it works', () => {
    resolver.walk(project.baseDir + '/packages/package-b/src/d.js');

    expect(intoFileIds(resolver.graph)).toMatchObject([
      project.baseDir + '/packages/package-b/src/e.ts',
      project.baseDir + '/packages/package-a/src/thing/index.ts',
      project.baseDir + '/packages/package-a/src/a.js',
      project.baseDir + '/packages/package-a/src/c.js',
      project.baseDir + '/packages/package-a/src/b.js',
      project.baseDir + '/packages/package-b/src/d.js',
    ]);
  });

  test('it works gts', () => {
    resolver.walk(project.baseDir + '/packages/package-c/src/g.gts');

    expect(intoFileIds(resolver.graph)).toMatchObject([
      project.baseDir + '/packages/package-b/src/e.ts',
      project.baseDir + '/packages/package-b/src/f.js',
      project.baseDir + '/packages/package-c/src/h.ts',
      project.baseDir + '/packages/package-c/src/g.gts',
    ]);
  });

  test('it works tsx', () => {
    resolver.walk(project.baseDir + '/packages/package-e/src/1.tsx');

    expect(intoFileIds(resolver.graph)).toMatchObject([
      project.baseDir + '/packages/package-e/src/foo/index.ts',
      project.baseDir + '/packages/package-e/src/4.jsx',
      project.baseDir + '/packages/package-a/src/thing/index.ts',
      project.baseDir + '/packages/package-a/src/a.js',
      project.baseDir + '/packages/package-a/src/c.js',
      project.baseDir + '/packages/package-a/src/b.js',
      project.baseDir + '/packages/package-e/src/3.jsx',
      project.baseDir + '/packages/package-e/src/2.mts',
      project.baseDir + '/packages/package-e/src/1.tsx',
    ]);
  });

  test('can find service when given a resolver', () => {
    const resolveServices = discoverServiceDependencies({});

    resolver = new Resolver({
      rootPath: project.baseDir,
      scanForImports: resolveServices,
      includeExternals: false,
    });

    resolver.walk(project.baseDir + '/packages/package-c/src/j.gjs');
    expect(intoFileIds(resolver.graph)).toMatchObject([
      project.baseDir + '/packages/package-d/addon/services/thing.js',
      project.baseDir + '/packages/package-c/src/k.gjs',
      project.baseDir + '/packages/package-b/src/e.ts',
      project.baseDir + '/packages/package-b/src/f.js',
      project.baseDir + '/packages/package-c/src/h.ts',
      project.baseDir + '/packages/package-c/src/j.gjs',
    ]);
  });

  test('can find services when given a resolver with a map', () => {
    const resolveServices = discoverServiceDependencies({
      tracking: 'package-d/services/tracking.js',
    });

    resolver = new Resolver({
      rootPath: project.baseDir,
      scanForImports: resolveServices,
      includeExternals: false,
    });

    resolver.walk(project.baseDir + '/packages/package-c/src/j.gjs');

    expect(intoFileIds(resolver.graph)).toMatchObject([
      project.baseDir + '/packages/package-d/addon/services/tracking.js',
      project.baseDir + '/packages/package-d/addon/services/thing.js',
      project.baseDir + '/packages/package-c/src/k.gjs',
      project.baseDir + '/packages/package-b/src/e.ts',
      project.baseDir + '/packages/package-b/src/f.js',
      project.baseDir + '/packages/package-c/src/h.ts',
      project.baseDir + '/packages/package-c/src/j.gjs',
    ]);
  });

  test('can resolve up from a declaration file if it has paths to itself', () => {
    resolver.walk(project.baseDir + '/packages/package-f/src/index.mts');

    expect(intoFileIds(resolver.graph)).toMatchObject([
      project.baseDir + '/packages/package-e/src/foo/index.ts',
      project.baseDir + '/packages/package-f/src/index.mts',
    ]);
  });

  test('can refer to things that dont really exists', () => {
    resolver.walk(project.baseDir + '/packages/package-f/unresolvable/index.js');

    expect(intoFileIds(resolver.graph)).toMatchObject([
      project.baseDir + '/packages/package-e/src/foo/index.ts',
      project.baseDir + '/packages/package-f/unresolvable/index.js',
    ]);
  });

  test('follows direct external dependencies', () => {
    resolver = new Resolver({ rootPath: project.baseDir, includeExternals: true });

    resolver.walk(project.baseDir + '/packages/with-externals-imports/src/index.mts');

    const files = intoFileIds(resolver.graph);

    expect(
      files.includes(
        project.baseDir +
          '/packages/with-externals-imports/node_modules/my-external-with-types/addon/not-followed.js'
      ),
      'Does not walk externals'
    ).toBe(false);

    expect(files).toMatchObject([
      '@ember/object', // we explicitly don't try to resolve @ember packages
      project.baseDir +
        '/packages/with-externals-imports/node_modules/my-external-with-types/addon/index.ts',
      project.baseDir + '/packages/with-externals-imports/src/other.js',
      project.baseDir +
        '/packages/with-externals-imports/node_modules/my-external-addon-no-types/addon/index.js',
      project.baseDir + '/packages/with-externals-imports/node_modules/my-external/dist/index.js',
      project.baseDir + '/packages/package-e/src/foo/index.ts',
      project.baseDir + '/packages/with-externals-imports/src/index.mts',
    ]);
  });

  test('resolver produces a graph that can be emitted as dotlang', () => {
    resolver = new Resolver({ rootPath: project.baseDir, includeExternals: true });
    resolver.walk(project.baseDir + '/packages/with-externals-imports/src/index.mts');
    expect(
      generateDotLanguage(resolver.graph).replace(new RegExp(project.baseDir, 'g'), '<tmp-path>')
    ).toMatchSnapshot();
  });

  test('resolver produces a graph that can be emitted as json', () => {
    resolver = new Resolver({ rootPath: project.baseDir, includeExternals: true });
    resolver.walk(project.baseDir + '/packages/with-externals-imports/src/index.mts');

    expect(
      generateJson(project.baseDir, resolver.graph, topSortFiles(resolver.graph))
    ).toMatchSnapshot();
  });

  test('it throws with path to file', () => {
    expect(() => {
      resolver.walk(project.baseDir + '/packages/parse-failure/src/index.js');
    }).toThrowError(`Failed to parse contents of file:`);
  });
});

function intoFileIds(graph: PackageGraph): string[] {
  return topSortFiles(graph).map((file) => file.id);
}
