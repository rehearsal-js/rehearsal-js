import { getLibrarySimple } from '@rehearsal/test-support';
import { describe, expect, test } from 'vitest';
import { ProjectGraph } from '../../src/entities/project-graph';
import { Package } from '../../src/entities/package';
import type { GraphNode } from '../../src/graph/node';
import type { ModuleNode, PackageNode } from '../../src/types';

function flatten(arr: GraphNode<ModuleNode | PackageNode>[]): Array<string> {
  return Array.from(arr).map((n) => {
    return n.content.key;
  });
}

describe('project-graph', () => {
  test('should create a graph', () => {
    const baseDir = getLibrarySimple();

    const projectGraph = new ProjectGraph(baseDir);

    const somePackage = new Package(baseDir);

    projectGraph.addPackageToGraph(somePackage);

    expect.assertions(6);

    expect(projectGraph.graph.hasNode('my-package')).toBe(true);
    expect(projectGraph.sourceType).toBe('JavaScript Library');
    const ordered = projectGraph.graph.topSort();
    expect(flatten(ordered)).toStrictEqual(['my-package']);
    const packageNode = ordered[0];
    const maybePackage = packageNode.content.pkg;

    if (maybePackage) {
      expect(maybePackage.hasModuleGraph()).toBe(false);
      const moduleGraphForPackage = maybePackage?.getModuleGraph(); // Forces creation of moduleGraph
      expect(maybePackage.hasModuleGraph()).toBe(true);
      expect(flatten(moduleGraphForPackage?.topSort())).toStrictEqual(['lib/a.js', 'index.js']);
    }
  });
  test('options.eager', async () => {
    const baseDir = getLibrarySimple();

    const projectGraph = new ProjectGraph(baseDir, { eager: true });
    const somePackage = new Package(baseDir);
    projectGraph.addPackageToGraph(somePackage);

    expect.assertions(6);

    expect(projectGraph.graph.hasNode('my-package')).toBe(true);
    expect(projectGraph.sourceType).toBe('JavaScript Library');
    const ordered = projectGraph.graph.topSort();
    expect(flatten(ordered)).toStrictEqual(['my-package']);
    const packageNode = ordered[0];
    const maybePackage = packageNode.content.pkg;

    expect(maybePackage.hasModuleGraph()).toBe(true);
    const moduleGraphForPackage = maybePackage?.getModuleGraph(); // Forces creation of moduleGraph
    expect(maybePackage.hasModuleGraph()).toBe(true);
    expect(flatten(moduleGraphForPackage?.topSort())).toStrictEqual(['lib/a.js', 'index.js']);
  });
});
