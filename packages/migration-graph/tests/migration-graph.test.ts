import { beforeAll, describe, expect, test } from 'vitest';

import { GraphNode, UniqueGraphNode } from '../src';
import { buildMigrationGraph, DetectedSource } from '../src/migration-graph';
import { getLibrarySimple } from './fixtures/library';
import { getEmberProjectFixture, testSetup } from './fixtures/project';

function flatten(arr: GraphNode<UniqueGraphNode>[]): string[] {
  return Array.from(arr).map((n) => n.content.key);
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
    beforeAll(() => testSetup());

    test('app', async () => {
      const project = await getEmberProjectFixture('app');

      const m = buildMigrationGraph(project.baseDir);
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
      const project = await getEmberProjectFixture('app-with-in-repo-addon');

      const m = buildMigrationGraph(project.baseDir);

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
      const project = await getEmberProjectFixture('app-with-in-repo-engine');
      const m = buildMigrationGraph(project.baseDir);
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
      const project = await getEmberProjectFixture('addon');

      const m = buildMigrationGraph(project.baseDir);
      expect(m.sourceType, 'should detect an EmberAddon').toBe(DetectedSource.EmberAddon);
      const orderedPackages = m.graph.topSort();

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
