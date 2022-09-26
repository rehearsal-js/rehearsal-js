import { PreparedApp } from 'scenario-tester';
import { beforeAll, describe, expect, test } from 'vitest';

import { GraphNode, UniqueGraphNode } from '../src';
import { buildMigrationGraph, DetectedSource } from '../src/migration-graph';
import { getLibrarySimple } from './fixtures/library';
import { getEmberAddon, getEmberApp, setup } from './fixtures/scenarios';

function flatten(arr: GraphNode<UniqueGraphNode>[]): string[] {
  return Array.from(arr).map((n) => n.content.key);
}

describe('migration-graph', () => {
  describe('package', () => {
    test('simple', () => {
      const rootDir = getLibrarySimple();
      const m = buildMigrationGraph(rootDir);

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
    beforeAll(() => {
      setup();
    });
    test('app', async () => {
      const app: PreparedApp = await getEmberApp('app');
      const m = buildMigrationGraph(app.dir);
      expect(m.sourceType, 'should detect an EmberApp').toBe(DetectedSource.EmberApp);
      const orderedPackages = m.graph.topSort();
      expect(flatten(orderedPackages)).toStrictEqual(['app-template']);
      expect(flatten(orderedPackages[0].content.modules.topSort())).toStrictEqual([
        'app/app.js',
        'app/components/salutation.js',
        'app/router.js',
      ]);
    });
    test('app-with-in-repo-addon', async () => {
      const app: PreparedApp = await getEmberApp('appWithInRepoAddon');
      const m = buildMigrationGraph(app.dir);
      expect(m.sourceType, 'should detect an EmberApp').toBe(DetectedSource.EmberApp);
      const orderedPackages = m.graph.topSort();
      expect(flatten(orderedPackages)).toStrictEqual(['some-addon', 'app-template']);
      expect(
        flatten(orderedPackages[0].content.modules.topSort()),
        'expected migraiton order for in-repo-addon'
      ).toStrictEqual(['addon/components/greet.js', 'app/components/greet.js', 'index.js']);

      // Expected order for files in app
      expect(
        flatten(orderedPackages[1].content.modules.topSort()),
        'expected migraiton order for app'
      ).toStrictEqual(['app/app.js', 'app/components/salutation.js', 'app/router.js']);
    });
    test('app-with-in-repo-engine', async () => {
      const app: PreparedApp = await getEmberApp('appWithInRepoEngine');
      const m = buildMigrationGraph(app.dir);
      expect(m.sourceType, 'should detect an EmberApp').toBe(DetectedSource.EmberApp);
      const orderedPackages = m.graph.topSort();
      expect(flatten(orderedPackages)).toStrictEqual(['some-engine', 'app-template']);
      expect(
        flatten(orderedPackages[0].content.modules.topSort()),
        'expected migraiton order for in-repo-engine'
      ).toStrictEqual(['addon/resolver.js', 'addon/engine.js', 'addon/routes.js', 'index.js']);

      expect(
        flatten(orderedPackages[1].content.modules.topSort()),
        'expected migraiton order for app'
      ).toStrictEqual(['app/app.js', 'app/components/salutation.js', 'app/router.js']);
    });
    test('addon', async () => {
      const app: PreparedApp = await getEmberAddon('addon');
      const m = buildMigrationGraph(app.dir);
      expect(m.sourceType, 'should detect an EmberAddon').toBe(DetectedSource.EmberAddon);
      const orderedPackages = m.graph.topSort();
      console.log(orderedPackages);
      expect(flatten(orderedPackages)).toStrictEqual(['addon-template']);
      expect(flatten(orderedPackages[0].content.modules.topSort())).toStrictEqual([
        'addon/components/greet.js',
        'app/components/greet.js',
        'index.js',
      ]);
    });
    test.todo('should filter package by name', () => {
      expect(true).toBe(false);
    });
  });
});
