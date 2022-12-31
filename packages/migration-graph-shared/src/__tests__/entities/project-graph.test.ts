import { getLibrary } from '@rehearsal/test-support';
import { describe, expect, test } from 'vitest';
import { ProjectGraph } from '../../entities/project-graph';
import { Package } from '../../entities/package';
import type { GraphNode } from '../../graph/node';
import type { ModuleNode, PackageNode } from '../../types';

function flatten(arr: GraphNode<ModuleNode | PackageNode>[]): Array<string> {
  return Array.from(arr).map((n) => {
    return n.content.key;
  });
}

describe('project-graph', () => {
  test('should create a graph', () => {
    const baseDir = getLibrary('simple');

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
  test('should ignore css imports', () => {
    const baseDir = getLibrary('library-with-css-imports');

    const projectGraph = new ProjectGraph(baseDir);
    const somePackage = new Package(baseDir);
    projectGraph.addPackageToGraph(somePackage);

    projectGraph.discover();

    expect(flatten(somePackage.getModuleGraph().topSort())).toStrictEqual(['lib/a.js', 'index.js']);
  });
  test('options.eager', () => {
    const baseDir = getLibrary('simple');

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
  describe('workspaces', () => {
    test('should discover packages defined in workspaces in package.json', () => {
      const baseDir = getLibrary('library-with-workspaces');

      const projectGraph = new ProjectGraph(baseDir);

      projectGraph.discover();
      expect(projectGraph.graph.hasNode('@something/foo')).toBe(true);
      expect(projectGraph.graph.hasNode('@something/bar')).toBe(true);
      expect(projectGraph.graph.hasNode('@something/baz')).toBe(true);
    });
    test('should find edges between packages', () => {
      const baseDir = getLibrary('library-with-workspaces');

      const projectGraph = new ProjectGraph(baseDir);

      projectGraph.discover();

      const fooNode = projectGraph.graph.getNode('@something/foo');
      const barNode = projectGraph.graph.getNode('@something/bar');
      const bazNode = projectGraph.graph.getNode('@something/baz');
      const blorpNode = projectGraph.graph.getNode('@something/blorp');

      expect(fooNode.adjacent.has(barNode)).toBe(true);
      expect(barNode.adjacent.has(bazNode)).toBe(true);
      expect(barNode.adjacent.has(blorpNode)).toBe(true);
    });
    test.todo('should do something if a cycle is found', () => {
      expect(true).toBe(false);
    });
  });
});
