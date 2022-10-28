import { describe, expect, test } from 'vitest';
import {
  getEmberProject,
  getEmberProjectFixture,
  getLibrarySimple,
  setupProject,
} from '@rehearsal/test-support';
import { GraphNode } from '../src/utils/graph-node';
import { ModuleNode, UniqueGraphNode } from '../src/types';
import { DetectedSource } from '../src/project-graph';
import { buildMigrationGraph } from '../src/migration-graph';

function flatten(arr: GraphNode<UniqueGraphNode>[]): string[] {
  return Array.from(arr).map((n) => n.content.key);
}

function filter(arr: GraphNode<ModuleNode>[]): GraphNode<ModuleNode>[] {
  return Array.from(arr).filter((n) => {
    return !n.content.synthetic;
  });
}

describe('migration-graph', () => {
  describe('package', () => {
    test('simple', () => {
      const baseDir = getLibrarySimple();
      const m = buildMigrationGraph(baseDir);

      expect(m.graph.hasNode('my-package')).toBe(true);
      expect(m.sourceType).toBe(DetectedSource.Library);
      expect(flatten(m.graph.topSort())).toStrictEqual(['my-package']);
      expect(flatten(m.graph.topSort()[0].content.modules.topSort())).toStrictEqual([
        'lib/a.js',
        'index.js',
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

      const m = buildMigrationGraph(project.baseDir);
      expect(m.sourceType, 'should detect an EmberApp').toBe(DetectedSource.EmberApp);
      const orderedPackages = m.graph.topSort();
      expect(flatten(orderedPackages)).toStrictEqual(['app-template']);
      expect(flatten(filter(orderedPackages[0].content.modules.topSort()))).toStrictEqual(
        EXPECTED_APP_FILES
      );
    });
    test('app-with-in-repo-addon', async () => {
      const project = await getEmberProjectFixture('app-with-in-repo-addon');

      const m = buildMigrationGraph(project.baseDir);

      expect(m.sourceType, 'should detect an EmberApp').toBe(DetectedSource.EmberApp);

      const orderedPackages = m.graph.topSort();
      // Package order is root to leaf
      expect(flatten(orderedPackages)).toStrictEqual(['app-template', 'some-addon']);

      expect(
        flatten(filter(orderedPackages[0].content.modules.topSort())),
        'expected migraiton order for app'
      ).toStrictEqual(EXPECTED_APP_FILES);

      expect(
        flatten(filter(orderedPackages[1].content.modules.topSort())),
        'expected migraiton order for addon'
      ).toStrictEqual(['addon/components/greet.js', 'app/components/greet.js', 'index.js']);
    });
    test('app-with-in-repo-engine', async () => {
      const project = await getEmberProjectFixture('app-with-in-repo-engine');
      const m = buildMigrationGraph(project.baseDir);
      expect(m.sourceType, 'should detect an EmberApp').toBe(DetectedSource.EmberApp);
      const orderedPackages = m.graph.topSort();
      expect(flatten(orderedPackages)).toStrictEqual(['app-template', 'some-engine']);

      expect(
        flatten(filter(orderedPackages[0].content.modules.topSort())),
        'expected migraiton order for app'
      ).toStrictEqual(EXPECTED_APP_FILES);

      expect(
        flatten(filter(orderedPackages[1].content.modules.topSort())),
        'expected migraiton order for in-repo-engine'
      ).toStrictEqual(['addon/resolver.js', 'addon/engine.js', 'addon/routes.js', 'index.js']);
    });
    test('addon', async () => {
      const project = await getEmberProjectFixture('addon');

      const m = buildMigrationGraph(project.baseDir);
      expect(m.sourceType, 'should detect an EmberAddon').toBe(DetectedSource.EmberAddon);
      const orderedPackages = m.graph.topSort();

      expect(flatten(orderedPackages)).toStrictEqual(['addon-template']);
      expect(flatten(filter(orderedPackages[0].content.modules.topSort()))).toStrictEqual([
        'addon/components/greet.js',
        'app/components/greet.js',
        'index.js',
      ]);
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
      const m = buildMigrationGraph(project.baseDir);

      expect(m.sourceType, 'should detect an EmberApp').toBe(DetectedSource.EmberApp);
      const orderedPackages = m.graph.topSort();

      expect(flatten(orderedPackages)).toStrictEqual(['some-addon', 'app-template']);

      const allFiles = Array.from(orderedPackages)
        .map((pkg) => {
          const modules = pkg.content.modules;
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
