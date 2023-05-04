import { describe, expect, test, afterEach } from 'vitest';
import { getEmberProjectFixture } from '@rehearsal/test-support';
import { Project } from 'fixturify-project';
import { EmberAddonProjectGraph } from '../../src/entities/ember-addon-project-graph.js';
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
  let project: Project;

  afterEach(() => {
    project.dispose();
  });

  test('should produce a graph of all files in an addon', async () => {
    project = await getEmberProjectFixture('addon');

    const projectGraph = new EmberAddonProjectGraph(project.baseDir, { basePath: project.baseDir });
    projectGraph.discover(true, true);

    const orderedPackages = projectGraph.graph.getSortedNodes();

    expect(flatten(orderedPackages)).toStrictEqual(['addon-template']);
    expect(
      flatten(
        filter(
          orderedPackages[0].content.pkg
            ?.getModuleGraph({ basePath: project.baseDir })
            .getSortedNodes() || []
        )
      )
    ).toStrictEqual([
      'addon/components/greet.js',
      'tests/acceptance/addon-template-test.js',
      'tests/dummy/app/app.js',
      'tests/dummy/app/router.js',
      'tests/test-helper.js',
    ]);
  });

  test('options.exclude', async () => {
    project = await getEmberProjectFixture('addon');

    const projectGraph = new EmberAddonProjectGraph(project.baseDir, {
      exclude: ['tests/dummy'],
      basePath: project.baseDir,
    });
    projectGraph.discover(true, true);

    const orderedPackages = projectGraph.graph.getSortedNodes();

    expect(flatten(orderedPackages)).toStrictEqual(['addon-template']);
    expect(
      flatten(
        filter(
          orderedPackages[0].content.pkg
            ?.getModuleGraph({ basePath: project.baseDir })
            .getSortedNodes() || []
        )
      )
    ).toStrictEqual([
      'addon/components/greet.js',
      'tests/acceptance/addon-template-test.js',
      'tests/test-helper.js',
    ]);
  });

  test('options.include', async () => {
    project = await getEmberProjectFixture('addon');

    const projectGraph = new EmberAddonProjectGraph(project.baseDir, {
      include: ['^app'],
      basePath: project.baseDir,
    });
    projectGraph.discover(true, true);

    const orderedPackages = projectGraph.graph.getSortedNodes();

    expect(flatten(orderedPackages)).toStrictEqual(['addon-template']);
    expect(
      flatten(
        filter(
          orderedPackages[0].content.pkg
            ?.getModuleGraph({ basePath: project.baseDir })
            .getSortedNodes() || []
        )
      )
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
