import { describe, beforeEach, expect, test, afterEach } from 'vitest';
import { Project } from 'fixturify-project';
import { Resolver } from '../src/resolver.js';
import { discoverServiceDependencies } from '../src/discover-services.js';
import { topSortFiles } from '../src/sort-graph.js';

describe('Resolver', () => {
  let resolver: Resolver;
  let project: Project;

  beforeEach(async () => {
    resolver = new Resolver();
    await resolver.load();
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
      },
    };

    await project.write();
  });

  afterEach(() => {
    project.dispose();
  });

  test('it works', () => {
    resolver.walk(project.baseDir + '/packages/package-b/src/d.js');

    expect(topSortFiles(resolver.graph)).toMatchObject([
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

    expect(topSortFiles(resolver.graph)).toMatchObject([
      project.baseDir + '/packages/package-b/src/e.ts',
      project.baseDir + '/packages/package-b/src/f.js',
      project.baseDir + '/packages/package-c/src/h.ts',
      project.baseDir + '/packages/package-c/src/g.gts',
    ]);
  });

  test('it works tsx', () => {
    resolver.walk(project.baseDir + '/packages/package-e/src/1.tsx');

    expect(topSortFiles(resolver.graph)).toMatchObject([
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

    resolver = new Resolver({ customResolver: resolveServices });

    resolver.walk(project.baseDir + '/packages/package-c/src/j.gjs');
    expect(topSortFiles(resolver.graph)).toMatchObject([
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

    resolver = new Resolver({ customResolver: resolveServices });

    resolver.walk(project.baseDir + '/packages/package-c/src/j.gjs');

    expect(topSortFiles(resolver.graph)).toMatchObject([
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

    expect(topSortFiles(resolver.graph)).toMatchObject([
      project.baseDir + '/packages/package-e/src/foo/index.ts',
      project.baseDir + '/packages/package-f/src/index.mts',
    ]);
  });
});
