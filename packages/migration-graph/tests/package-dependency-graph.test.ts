import path, { join } from 'path';
import { EmberAddonPackage, EmberPackage } from '@rehearsal/migration-graph-ember';
import { Package } from '@rehearsal/migration-graph-shared';
import fixturify from 'fixturify';
import { mkdirSync } from 'fs-extra';
import rimraf from 'rimraf';
import { dirSync, setGracefulCleanup } from 'tmp';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { MigrationGraph } from '../src/migration-graph';
import { EmberAppPackageDependencyGraph } from '../src/package-dependency-graph/ember-app';

import { createPackageDependencyGraph } from '../src/package-dependency-graph';
import { ModuleNode, PackageNode } from '../src/types';
import { Graph } from '../src/utils/graph';
import { GraphNode } from '../src/utils/graph-node';
import { getLibrarySimple } from './fixtures/library';
import {
  getEmberProject,
  getEmberProjectFixture,
  setupProject,
  testSetup,
} from './fixtures/project';
import { getEmberAddonWithInRepoAddonFiles } from './fixtures/files';
import merge from 'lodash.merge';

setGracefulCleanup();

function flatten(arr: GraphNode<ModuleNode | PackageNode>[]): Array<string> {
  return Array.from(arr).map((n) => {
    return n.content.key;
  });
}

describe('createFileDependencyGraph', () => {
  const testSuiteTmpDir = path.join(process.cwd(), 'tmp');

  function getTmpDir(): string {
    const { name: tmpDir } = dirSync({ tmpdir: testSuiteTmpDir });
    return tmpDir;
  }

  beforeAll(() => {
    rimraf.sync(testSuiteTmpDir);
    mkdirSync(testSuiteTmpDir);
  });

  afterAll(() => {
    rimraf.sync(testSuiteTmpDir);
  });

  test('should construct a graph; simple', async () => {
    const tmpDir = getTmpDir();

    const files = {
      'package.json': '{}',
      'index.js': `import './a'`,
      'a.js': `import './b'`,
      'b.js': ``,
    };

    fixturify.writeSync(tmpDir, files);

    const g = new Graph<ModuleNode>();

    // index -> a -> b
    // index -> a -> b
    let filePath;
    filePath = 'index.js';
    const index = g.addNode({ key: filePath, path: filePath });
    filePath = 'a.js';
    const nodeA = g.addNode({ key: filePath, path: filePath });
    filePath = 'b.js';
    const nodeB = g.addNode({ key: filePath, path: filePath });

    g.addEdge(index, nodeA);
    g.addEdge(nodeA, nodeB);

    const output: Graph<ModuleNode> = createPackageDependencyGraph(new Package(tmpDir));

    expect(flatten(output.topSort())).toStrictEqual(flatten(g.topSort()));
  });

  test('should dedupe nodes e.g. reused imports', async () => {
    const tmpDir = getTmpDir();

    const files = {
      'package.json': '{}',
      'index.js': `import './lib/a'; import './lib/b';`,
      lib: {
        'a.js': `import './b'`,
        'b.js': ``,
      },
    };

    fixturify.writeSync(tmpDir, files);

    const g = new Graph<ModuleNode>();

    // index -> a -> b
    let filePath;
    filePath = 'index.js';
    const index = g.addNode({ key: filePath, path: filePath });
    filePath = 'lib/a.js';
    const nodeA = g.addNode({ key: filePath, path: filePath });
    filePath = 'lib/b.js';
    const nodeB = g.addNode({ key: filePath, path: filePath });

    g.addEdge(index, nodeA);
    g.addEdge(index, nodeB);
    g.addEdge(nodeA, nodeB);

    const output: Graph<ModuleNode> = createPackageDependencyGraph(new Package(tmpDir));

    expect(flatten(output.topSort())).toStrictEqual(flatten(g.topSort()));
  });

  test('should handle circular dependencies', async () => {
    const tmpDir = getTmpDir();

    const files = {
      'package.json': '{}',
      'index.js': `
          import './lib/b';
          `,
      lib: {
        'a.js': `
            import './b';
          `,
        'b.js': `
            import './a';
          `,
      },
    };

    fixturify.writeSync(tmpDir, files);

    const output: Graph<ModuleNode> = createPackageDependencyGraph(new Package(tmpDir));
    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/a.js', 'lib/b.js', 'index.js']);
  });

  test('should handle re-exporting', async () => {
    const tmpDir = getTmpDir();

    const files = {
      'package.json': '{}',
      'index.js': `
        export { foo } from './lib/file';
        `,
      lib: {
        'file.js': `
          const foo = 2;
          export { foo }
        `,
      },
    };

    fixturify.writeSync(tmpDir, files);

    const output: Graph<ModuleNode> = createPackageDependencyGraph(new Package(tmpDir));

    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/file.js', 'index.js']);
  });

  test("should handle aggregating exports e.g. '*' ", async () => {
    const tmpDir = getTmpDir();

    const files = {
      'package.json': '{}',
      'index.js': `
        export * from './lib/phrases';
        `,
      lib: {
        'phrases.js': `
          const phrase1 = 'hello';
          const phrase2 = 'hola';
          const phrase3 = 'ciao';
          export { foo, bar, gnar }
        `,
      },
    };

    fixturify.writeSync(tmpDir, files);

    const output: Graph<ModuleNode> = createPackageDependencyGraph(new Package(tmpDir));

    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/phrases.js', 'index.js']);
  });

  test("should handle aggregating exports e.g. '* as phrases' ", async () => {
    const tmpDir = getTmpDir();

    const files = {
      'package.json': '{}',
      'index.js': `
        export * as phrases from './lib/phrases';
        `,
      lib: {
        'phrases.js': `
          const phrase1 = 'hello';
          const phrase2 = 'hola';
          const phrase3 = 'ciao';
          export { phrase1, phrase2, phrase3 }
        `,
      },
    };

    fixturify.writeSync(tmpDir, files);

    const output: Graph<ModuleNode> = createPackageDependencyGraph(new Package(tmpDir));

    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/phrases.js', 'index.js']);
  });

  test('should ignore node_modules ', async () => {
    const baseDir = getLibrarySimple();
    const output: Graph<ModuleNode> = createPackageDependencyGraph(new Package(baseDir));
    const actual = flatten(output.topSort());
    expect(actual).toStrictEqual(['lib/a.js', 'index.js']);
  });

  test('should detect file extension in moduleName', async () => {
    const tmpDir = getTmpDir();

    const files = {
      'package.json': '{}',
      'index.js': `
        import './a.js';
        `,
      'a.js': ``,
    };

    fixturify.writeSync(tmpDir, files);

    const output: Graph<ModuleNode> = createPackageDependencyGraph(new Package(tmpDir));

    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['a.js', 'index.js']);
  });

  test('should resolve a directory with package.json and main entry', async () => {
    const tmpDir = getTmpDir();

    const files = {
      'package.json': '{}',
      'index.js': `
        import './some-dir';
        `,
      'some-dir': {
        'package.json': JSON.stringify({
          main: 'not-obvious.js',
        }),
        'not-obvious.js': `console.log('hello');`,
      },
    };

    fixturify.writeSync(tmpDir, files);

    const output: Graph<ModuleNode> = createPackageDependencyGraph(new Package(tmpDir));

    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['some-dir/not-obvious.js', 'index.js']);
  });

  describe('EmberAppPackageDependencyGraph', () => {
    beforeAll(() => testSetup());
    test('should determine what graph to create (e.g. library | app | addon)', async () => {
      const project = await getEmberProjectFixture('app');

      const output: Graph<ModuleNode> = createPackageDependencyGraph(
        new EmberPackage(project.baseDir)
      );
      const actual = flatten(output.topSort());

      expect(actual).toStrictEqual([
        'app/app.js',
        'app/services/locale.js',
        'app/components/salutation.js',
        'app/router.js',
      ]);
    });

    test('should produce a graph from an ember app', async () => {
      const project = await getEmberProjectFixture('app');

      const p = new EmberPackage(project.baseDir);
      const options = {};
      const output: Graph<ModuleNode> = new EmberAppPackageDependencyGraph(p, options).discover();
      const actual = flatten(output.topSort());

      expect(actual).toStrictEqual([
        'app/app.js',
        'app/services/locale.js',
        'app/components/salutation.js',
        'app/router.js',
      ]);
    });

    test('should handle nested services', async () => {
      const project = getEmberProject('app');

      project.mergeFiles({
        app: {
          services: {
            'date.js': `
              import { inject as service } from '@ember/service';
              export default class DateService extends Service {}
            `,
            'request.js': `
              import Service from '@ember/service';
              import { inject as service } from '@ember/service';
              export default class Request extends Service {
                @service date;
              }
            `,
            'locale.js': `
              import Service from '@ember/service';
              import { inject as service } from '@ember/service';
              export default class Locale extends Service {
                @service request;
                current() {
                  return 'en-US';
                }
              }
            `,
          },
        },
      });

      await setupProject(project);

      const p = new EmberPackage(project.baseDir);
      const options = {};
      const output: Graph<ModuleNode> = new EmberAppPackageDependencyGraph(p, options).discover();
      const actual = flatten(output.topSort());

      expect(actual).toStrictEqual([
        'app/app.js',
        'app/services/date.js',
        'app/services/request.js',
        'app/services/locale.js',
        'app/components/salutation.js',
        'app/router.js',
      ]);
    });

    test('should use options.resolutions.services to ignore non-obvious externals', async () => {
      const project = getEmberProject('app');

      project.mergeFiles({
        app: {
          components: {
            'fancy.js': `
              import Component from '@glimmer/component';
              import { inject as service } from '@ember/service';
      
              export default class Salutation extends Component {
                @service fastboot;
              }
            `,
          },
        },
      });
      const packageName = 'lib/some-addon/addon/services/orphan';

      project.addDependency(packageName, '1.0.0');

      await setupProject(project);

      const p = new EmberPackage(project.baseDir);
      const options = {
        resolutions: {
          services: {
            fastboot: packageName,
          },
        },
      };

      const output: Graph<ModuleNode> = new EmberAppPackageDependencyGraph(p, options).discover();
      const actual = flatten(output.topSort());

      expect(actual).toStrictEqual([
        'app/app.js',
        'app/components/fancy.js',
        'app/services/locale.js',
        'app/components/salutation.js',
        'app/router.js',
      ]);
    });

    test('should find a synthetic package node when an external service is discovered', async () => {
      const project = getEmberProject('app');

      project.mergeFiles({
        app: {
          components: {
            'obtuse.js': `
              import Component from '@glimmer/component';
              import { inject as service } from '@ember/service';
      
              export default class Obtuse extends Component {
                @service('some-addon@date') myDate;
              }
            `,
          },
        },
      });

      await setupProject(project);

      const m = new MigrationGraph(project.baseDir);
      const emberPackage = new EmberPackage(project.baseDir);
      const source = m.addPackageToGraph(emberPackage);
      const dest = m.graph.getNode('some-addon');
      expect(dest).toBeTruthy();
      expect(dest?.content.synthetic, 'the addon node to be synthetic').toBe(true);

      expect(
        dest ? source.adjacent.has(dest) : false,
        'there to be an edge between the app (source) and the addon (dest)'
      ).toBe(true);
    });

    test('should update sythetic node with actual packageNode once added', async () => {
      const project = getEmberProject('app-with-in-repo-addon');

      project.mergeFiles({
        app: {
          components: {
            'obtuse.js': `
              import Component from '@glimmer/component';
              import { inject as service } from '@ember/service';
      
              export default class Obtuse extends Component {
                @service('some-addon@date') myDate;
              }
            `,
          },
        },
        lib: {
          'some-addon': {
            addon: {
              service: {
                'date.js': `
                  import { inject as service } from '@ember/service';
                  export default class DateService extends Service {}
                `,
              },
            },
            app: {
              services: {
                'date.js': `export { default } from 'some-addon/services/date';`,
              },
            },
          },
        },
      });

      await setupProject(project);

      const m = new MigrationGraph(project.baseDir);

      const emberPackage = new EmberPackage(project.baseDir);
      const appNode = m.addPackageToGraph(emberPackage);
      const node = m.graph.getNode('some-addon');
      expect(node?.content.synthetic).toBe(true);

      const emberAddonPackage = new EmberAddonPackage(join(project.baseDir, 'lib/some-addon'));
      const addonNode = m.addPackageToGraph(emberAddonPackage);
      expect(addonNode.content.synthetic).toBeFalsy();

      // Validate that addonn package has an the edge exists between
      expect(appNode.adjacent.has(addonNode)).toBe(true);
    });

    test.todo('should update graph to show nested addon service dependencies', async () => {
      const project = getEmberProject('app-with-in-repo-addon');

      // app uses a service `date` from `some-addon`
      // └── some-addon exposes `date` and consumes a service `time` from `another-addon`
      //     └── another-addon exposes a service `time`.

      const files: Record<string, any> = {
        app: {
          components: {
            'obtuse.js': `
              import Component from '@glimmer/component';
              import { inject as service } from '@ember/service';
      
              export default class Obtuse extends Component {
                @service('some-addon@date') d;
              }
            `,
          },
        },
        lib: {
          'some-addon': {
            addon: {
              services: {
                'date.js': `
                  import { inject as service } from '@ember/service';
                  export default class DateService extends Service {
                    @service('nested-addon@time') t;
                  }
                `,
              },
            },
            app: {
              services: {
                'date.js': `export { default } from 'some-addon/services/date';`,
              },
            },
          },
        },
      };

      const anotherAddonName = 'another-addon';

      const anotherAddonFiles = merge(getEmberAddonWithInRepoAddonFiles(anotherAddonName), {
        addon: {
          services: {
            'time.js': `
              import { inject as service } from '@ember/service';
              export default class TimeService extends Service {}
            `,
          },
        },
        app: {
          services: {
            'time.js': `export { default } from '${anotherAddonName}/services/time';`,
          },
        },
      });

      files.lib[anotherAddonName] = anotherAddonFiles;

      project.mergeFiles(files);

      // Add anotherAddon to the package.json of the app
      project.pkg['ember-addon'].paths.push(`lib/${anotherAddonName}`);

      await setupProject(project);

      const m = new MigrationGraph(project.baseDir);

      const emberPackage = new EmberPackage(project.baseDir);
      const appNode = m.addPackageToGraph(emberPackage);
      const node = m.graph.getNode('some-addon');
      expect(node?.content.synthetic).toBe(true);

      const someAddonPackage = new EmberAddonPackage(join(project.baseDir, 'lib/some-addon'));
      const someAddonNode = m.addPackageToGraph(someAddonPackage);
      expect(someAddonNode.content.synthetic).toBeFalsy();

      expect(appNode.adjacent.has(someAddonNode)).toBe(true);

      const anotherAddonPackage = new EmberAddonPackage(join(project.baseDir, 'lib/another-addon'));
      const anotherAddonNode = m.addPackageToGraph(anotherAddonPackage);
      expect(someAddonNode.adjacent.has(anotherAddonNode)).toBe(true);

      expect(flatten(m.graph.topSort())).toEqual(['another-addon', 'some-addon', 'app']);
    });
  });
});
