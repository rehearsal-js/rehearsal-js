import { describe, expect, test } from 'vitest';
import { getEmberProjectFixture } from '@rehearsal/test-support';
import { EmberAddonProjectGraph } from '../../src/entities/ember-addon-project-graph';
import type { GraphNode, ModuleNode, UniqueNode } from '@rehearsal/migration-graph-shared';

function flatten(arr: GraphNode<UniqueNode>[]): string[] {
  return Array.from(arr).map((n) => n.content.key);
}

function filter(arr: GraphNode<ModuleNode>[]): GraphNode<ModuleNode>[] {
  return Array.from(arr).filter((n) => {
    return !n.content.synthetic;
  });
}

describe('Unit | EmberAddonProjectGraph', () => {
  test('should produce a graph of all files in an addon', async () => {
    const project = await getEmberProjectFixture('addon');

    const projectGraph = new EmberAddonProjectGraph(project.baseDir);
    projectGraph.discover();

    const orderedPackages = projectGraph.graph.topSort();

    expect(flatten(orderedPackages)).toStrictEqual(['addon-template']);
    expect(
      flatten(filter(orderedPackages[0].content.pkg.getModuleGraph().topSort()))
    ).toStrictEqual([
      'addon/components/greet.js',
      'tests/acceptance/addon-template-test.js',
      'tests/dummy/app/app.js',
      'tests/dummy/app/router.js',
      'tests/test-helper.js',
    ]);
  });

  test('options.exclude', async () => {
    const project = await getEmberProjectFixture('addon');

    const projectGraph = new EmberAddonProjectGraph(project.baseDir, { exclude: ['tests/dummy'] });
    projectGraph.discover();

    const orderedPackages = projectGraph.graph.topSort();

    expect(flatten(orderedPackages)).toStrictEqual(['addon-template']);
    expect(
      flatten(filter(orderedPackages[0].content.pkg.getModuleGraph().topSort()))
    ).toStrictEqual([
      'addon/components/greet.js',
      'tests/acceptance/addon-template-test.js',
      'tests/test-helper.js',
    ]);
  });

  test('options.include', async () => {
    const project = await getEmberProjectFixture('addon');

    const projectGraph = new EmberAddonProjectGraph(project.baseDir, { include: ['^app'] });
    projectGraph.discover();

    const orderedPackages = projectGraph.graph.topSort();

    expect(flatten(orderedPackages)).toStrictEqual(['addon-template']);
    expect(
      flatten(filter(orderedPackages[0].content.pkg.getModuleGraph().topSort()))
    ).toStrictEqual([
      'addon/components/greet.js',
      'app/components/greet.js',
      'tests/acceptance/addon-template-test.js',
      'tests/dummy/app/app.js',
      'tests/dummy/app/router.js',
      'tests/test-helper.js',
    ]);
  });
});
