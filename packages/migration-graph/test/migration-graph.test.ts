import { describe, expect, test } from 'vitest';
import {
  getEmberProject,
  getEmberProjectFixture,
  getLibrary,
  setupProject,
} from '@rehearsal/test-support';
import { GraphNode, ModuleNode, UniqueNode } from '@rehearsal/migration-graph-shared';

import { SourceType } from '../src/source-type';
import { buildMigrationGraph } from '../src/migration-graph';

function flatten(arr: GraphNode<UniqueNode>[]): string[] {
  return Array.from(arr).map((n) => n.content.key);
}

function filter(arr: GraphNode<ModuleNode>[]): GraphNode<ModuleNode>[] {
  return Array.from(arr).filter((n) => {
    return !n.content.synthetic;
  });
}

describe('migration-graph', () => {
  describe('library', () => {
    test('simple', () => {
      const baseDir = getLibrary('simple');
      const { projectGraph, sourceType } = buildMigrationGraph(baseDir);

      expect(projectGraph.graph.hasNode('my-package')).toBe(true);
      expect(projectGraph.sourceType).toBe(SourceType.Library);
      expect(sourceType).toBe(SourceType.Library);
      expect(flatten(projectGraph.graph.topSort())).toStrictEqual(['my-package']);
      expect(
        flatten(projectGraph.graph.topSort()[0].content.pkg.getModuleGraph().topSort())
      ).toStrictEqual(['lib/a.js', 'index.js']);
    });

    test('library with loose files in root', () => {
      const baseDir = getLibrary('library-with-loose-files');
      const { projectGraph, sourceType } = buildMigrationGraph(baseDir);

      expect(projectGraph.graph.hasNode('my-package-with-loose-files')).toBe(true);
      expect(projectGraph.sourceType).toBe(SourceType.Library);
      expect(sourceType).toBe(SourceType.Library);
      expect(flatten(projectGraph.graph.topSort())).toStrictEqual(['my-package-with-loose-files']);
      expect(
        flatten(projectGraph.graph.topSort()[0].content.pkg.getModuleGraph().topSort())
      ).toStrictEqual([
        'Events.js',
        'utils/Defaults.js',
        'State.js',
        'Widget.js',
        'WidgetManager.js',
      ]);
    });

    test('workspace', () => {
      const baseDir = getLibrary('library-with-workspaces');
      const { projectGraph, sourceType } = buildMigrationGraph(baseDir);

      expect(projectGraph.sourceType).toBe(SourceType.Library);
      expect(sourceType).toBe(SourceType.Library);

      expect(projectGraph.graph.hasNode('some-library-with-workspace')).toBe(true);
      expect(projectGraph.graph.hasNode('@something/foo')).toBe(true);
      expect(projectGraph.graph.hasNode('@something/bar')).toBe(true);
      expect(projectGraph.graph.hasNode('@something/baz')).toBe(true);
      expect(projectGraph.graph.hasNode('@something/blorp')).toBe(true);

      const sortedPackages = projectGraph.graph.topSort();

      expect(flatten(sortedPackages)).toStrictEqual([
        '@something/baz',
        '@something/blorp',
        '@something/bar',
        '@something/foo',
        'some-library-with-workspace', // root package is last
      ]);

      const [packageNodeBaz, packageNodeBlorp, packageNodeBar, packageNodeFoo, packageNodeRoot] =
        sortedPackages;

      expect(packageNodeBaz.content.pkg.packageName).toBe('@something/baz');
      expect(flatten(packageNodeBaz.content.pkg.getModuleGraph().topSort())).toStrictEqual([]);

      expect(packageNodeBlorp.content.pkg.packageName).toBe('@something/blorp');
      expect(flatten(packageNodeBlorp.content.pkg.getModuleGraph().topSort())).toStrictEqual([
        'build.js', // file contains out of package file dendency from root package.
        'lib/impl.js',
        'index.js',
      ]);

      expect(packageNodeBar.adjacent.has(packageNodeBaz)).toBeTruthy();
      expect(packageNodeBar.content.pkg.packageName).toBe('@something/bar');
      expect(flatten(packageNodeBar.content.pkg.getModuleGraph().topSort())).toStrictEqual([]);

      expect(packageNodeFoo.content.pkg.packageName).toBe('@something/foo');
      expect(flatten(packageNodeFoo.content.pkg.getModuleGraph().topSort())).toStrictEqual([
        'lib/a.js',
        'index.js',
      ]);

      expect(packageNodeRoot.content.pkg.packageName).toBe('some-library-with-workspace');
      expect(flatten(packageNodeRoot.content.pkg.getModuleGraph().topSort())).toStrictEqual([
        'some-util.js',
      ]);
    });
  });

  describe('ember', () => {
    const EXPECTED_APP_FILES = [
      'app/app.js',
      'app/services/locale.js',
      'app/components/salutation.js',
      'app/router.js',
    ];

    test('app', async () => {
      const project = await getEmberProjectFixture('app');

      const { projectGraph, sourceType } = buildMigrationGraph(project.baseDir);
      expect(sourceType, 'should detect an EmberApp').toBe(SourceType.EmberApp);
      const orderedPackages = projectGraph.graph.topSort();
      expect(flatten(orderedPackages)).toStrictEqual(['app-template']);
      expect(
        flatten(filter(orderedPackages[0].content.pkg.getModuleGraph().topSort()))
      ).toStrictEqual(EXPECTED_APP_FILES);
    });
    test('app-with-in-repo-addon', async () => {
      const project = await getEmberProjectFixture('app-with-in-repo-addon');

      const { projectGraph, sourceType } = buildMigrationGraph(project.baseDir);

      expect(projectGraph.sourceType, 'should detect an EmberApp').toBe(SourceType.EmberApp);
      expect(sourceType, 'should detect an EmberApp').toBe(SourceType.EmberApp);
      const rootNode = projectGraph.graph.getNode('app-template');

      const orderedPackages = projectGraph.graph.topSort(rootNode);

      const addonNode = projectGraph.graph.getNode('some-addon');

      expect(
        rootNode.adjacent.has(addonNode),
        'should have an edge between app and in-repo-addon'
      ).toBe(true);

      expect(addonNode.parent, 'parent should be rootNode').toBe(rootNode);

      // Package order is leaf to root
      expect(flatten(orderedPackages)).toStrictEqual(['some-addon', 'app-template']);

      expect(
        flatten(filter(orderedPackages[0].content.pkg.getModuleGraph().topSort())),
        'expected migraiton order for addon'
      ).toStrictEqual(['addon/components/greet.js', 'app/components/greet.js', 'index.js']);

      expect(
        flatten(filter(orderedPackages[1].content.pkg.getModuleGraph().topSort())),
        'expected migraiton order for app'
      ).toStrictEqual(EXPECTED_APP_FILES);
    });
    test('app-with-in-repo-engine', async () => {
      const project = await getEmberProjectFixture('app-with-in-repo-engine');
      const { projectGraph, sourceType } = buildMigrationGraph(project.baseDir);

      expect(projectGraph.sourceType, 'should detect an EmberApp').toBe(SourceType.EmberApp);
      expect(sourceType, 'should detect an EmberApp').toBe(SourceType.EmberApp);

      const rootNode = projectGraph.graph.getNode('app-template');
      const orderedPackages = projectGraph.graph.topSort(rootNode);

      expect(flatten(orderedPackages)).toStrictEqual(['some-engine', 'app-template']);
      expect(
        flatten(filter(orderedPackages[0].content.pkg.getModuleGraph().topSort())),
        'expected migraiton order for in-repo-engine'
      ).toStrictEqual(['addon/resolver.js', 'addon/engine.js', 'addon/routes.js', 'index.js']);

      expect(
        flatten(filter(orderedPackages[1].content.pkg.getModuleGraph().topSort())),
        'expected migraiton order for app'
      ).toStrictEqual(EXPECTED_APP_FILES);
    });
    test('addon', async () => {
      const project = await getEmberProjectFixture('addon');

      const { projectGraph, sourceType } = buildMigrationGraph(project.baseDir);

      expect(projectGraph.sourceType, 'should detect an EmberAddon').toBe(SourceType.EmberAddon);
      expect(sourceType, 'should detect an EmberAddon').toBe(SourceType.EmberAddon);

      const orderedPackages = projectGraph.graph.topSort();

      expect(flatten(orderedPackages)).toStrictEqual(['addon-template']);
      expect(
        flatten(filter(orderedPackages[0].content.pkg.getModuleGraph().topSort()))
      ).toStrictEqual(['addon/components/greet.js', 'app/components/greet.js', 'index.js']);
    });
    test('should create a dependency between an app using a service from an in-repo addon', async () => {
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
              services: {
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
      const { projectGraph, sourceType } = buildMigrationGraph(project.baseDir);

      expect(projectGraph.sourceType, 'should detect an EmberApp').toBe(SourceType.EmberApp);
      expect(sourceType, 'should detect an EmberApp').toBe(SourceType.EmberApp);

      const rootNode = projectGraph.graph.getNode('app-template');
      const addonNode = projectGraph.graph.getNode('some-addon');

      expect(
        rootNode.adjacent.has(addonNode),
        'should have an edge between app and in-repo-addon'
      ).toBe(true);

      const orderedPackages = projectGraph.graph.topSort(rootNode);

      expect(flatten(orderedPackages)).toStrictEqual(['some-addon', 'app-template']);

      const allFiles = Array.from(orderedPackages)
        .map((pkg) => {
          const modules = pkg.content.pkg.getModuleGraph();
          return flatten(modules.topSort());
        })
        .flat();

      expect(allFiles).toStrictEqual([
        'addon/components/greet.js',
        'addon/services/date.js',
        'app/components/greet.js',
        'app/services/date.js',
        'index.js',
        'app/app.js',
        'app/components/obtuse.js',
        'app/services/locale.js',
        'app/components/salutation.js',
        'app/router.js',
      ]);
    });
    test.todo('should filter package by name', () => {
      expect(true).toBe(false);
    });
  });
});
