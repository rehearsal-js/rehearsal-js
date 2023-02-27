import { getLibrary } from '@rehearsal/test-support';
import { describe, expect, test } from 'vitest';
import { ProjectGraph } from '../../src/entities/project-graph';
import type { GraphNode } from '../../src/graph/node';
import type { ModuleNode, PackageNode } from '../../src/types';

function flatten(arr: GraphNode<ModuleNode | PackageNode>[]): Array<string> {
  return Array.from(arr).map((n) => {
    return n.content.key;
  });
}

describe('project-graph', () => {
  const EXPECTED_FILES = ['lib/a.js', 'index.js', 'test/sample.test.js'];
  test('should create a graph', () => {
    const baseDir = getLibrary('library-with-tests');

    const projectGraph = new ProjectGraph(baseDir);
    projectGraph.discover();

    expect.assertions(6);

    expect(projectGraph.graph.hasNode('my-package')).toBe(true);
    expect(projectGraph.sourceType).toBe('JavaScript Library');
    const ordered = projectGraph.graph.topSort();
    expect(flatten(ordered)).toStrictEqual(['my-package']);
    const packageNode = ordered[0];
    const somePackage = packageNode.content.pkg;

    expect(somePackage.hasModuleGraph()).toBe(false);
    const moduleGraphForPackage = somePackage?.getModuleGraph(); // Forces creation of moduleGraph
    expect(somePackage.hasModuleGraph()).toBe(true);
    expect(flatten(moduleGraphForPackage?.topSort())).toStrictEqual(EXPECTED_FILES);
  });

  test('should ignore `.<name>.js files (eg. .babelrc.js or .eslintrc.js)', () => {
    const baseDir = getLibrary('library-with-ignored-files');

    const projectGraph = new ProjectGraph(baseDir);
    projectGraph.discover();
    const somePackage = projectGraph.graph.topSort()[0].content.pkg;

    expect(flatten(somePackage.getModuleGraph().topSort())).toStrictEqual(EXPECTED_FILES);
  });

  test('should ignore .lock files', () => {
    // create variant with locks files
    const baseDir = getLibrary('library-with-ignored-files');

    // Add dummy lock files package-lock.json, npm-shrinkwrap.json package-lock.json, yarn.lock, pnpm-lock.yaml

    const projectGraph = new ProjectGraph(baseDir);
    projectGraph.discover();

    const somePackage = projectGraph.graph.topSort()[0].content.pkg;

    expect(flatten(somePackage.getModuleGraph().topSort())).toStrictEqual(EXPECTED_FILES);
  });

  test('library should ignore files', () => {
    // Create variant with ignored files or directories
    const baseDir = getLibrary('library-with-ignored-files');
    const projectGraph = new ProjectGraph(baseDir);
    projectGraph.discover();

    const somePackage = projectGraph.graph.topSort()[0].content.pkg;

    const files = flatten(somePackage.getModuleGraph().topSort());

    expect(files).toStrictEqual(['lib/a.js', 'index.js', 'test/sample.test.js']);
  });

  test('should include loose files in rootDir', () => {
    const baseDir = getLibrary('library-with-loose-files');

    const projectGraph = new ProjectGraph(baseDir);
    projectGraph.discover();

    expect(projectGraph.graph.hasNode('my-package-with-loose-files')).toBe(true);
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

  test('options.eager', () => {
    const baseDir = getLibrary('simple');

    let projectGraph, somePackage;

    // In the eager test, we're not trying to validate discover() logic
    // We're trying to see once a package is added, that it's source moduleGraph
    // is created before access via somePackage.moduleGraph();

    projectGraph = new ProjectGraph(baseDir);
    projectGraph.discover();
    somePackage = projectGraph.graph.getNode('my-package').content.pkg;
    expect(somePackage.hasModuleGraph(), 'should not exist by default').toBe(false);

    projectGraph = new ProjectGraph(baseDir, { eager: true });
    projectGraph.discover();
    somePackage = projectGraph.graph.getNode('my-package').content.pkg;
    expect(somePackage.hasModuleGraph(), 'should exist when options.eager=true').toBe(true);
  });

  describe('options.entrypoint', () => {
    test('should work with a file', () => {
      const baseDir = getLibrary('simple');
      let projectGraph, sortedPackages, orderedFiles;

      projectGraph = new ProjectGraph(baseDir, { entrypoint: 'index.js' });
      projectGraph.discover();

      sortedPackages = Array.from(projectGraph.graph.topSort()).map((node) => node.content.pkg);

      orderedFiles = sortedPackages.reduce((allFiles, p) => {
        const files = flatten(p.getModuleGraph().topSort());
        return [...allFiles, ...files];
      }, new Array<string>());

      expect(orderedFiles).toStrictEqual(['lib/a.js', 'index.js']);

      projectGraph = new ProjectGraph(baseDir, { entrypoint: './index.js' });
      projectGraph.discover();

      sortedPackages = Array.from(projectGraph.graph.topSort()).map((node) => node.content.pkg);

      orderedFiles = sortedPackages.reduce((allFiles, p) => {
        const files = flatten(p.getModuleGraph().topSort());
        return [...allFiles, ...files];
      }, new Array<string>());

      expect(orderedFiles).toStrictEqual(['lib/a.js', 'index.js']);
    });

    test('should work with a directory', () => {
      const baseDir = getLibrary('library-with-workspaces');

      const projectGraph = new ProjectGraph(baseDir, { entrypoint: 'packages/foo/index.js' });
      projectGraph.discover();

      const orderedPackages = Array.from(projectGraph.graph.topSort()).map(
        (node) => node.content.pkg
      );

      const orderedFiles = orderedPackages.reduce((allFiles, p) => {
        const moduleNodes = Array.from(p.getModuleGraph().topSort());
        const files = moduleNodes.map((moduleNode) => moduleNode.content.path);
        return [...allFiles, ...files];
      }, new Array<string>());

      expect(orderedFiles).toStrictEqual(['packages/foo/lib/a.js', 'packages/foo/index.js']);
    });
  });

  test('options.include', () => {
    const baseDir = getLibrary('library-with-ignored-files');

    const projectGraph = new ProjectGraph(baseDir, { include: ['Brocfile.js'] });
    const [somePackage] = projectGraph.discover();
    expect(flatten(somePackage.getModuleGraph().topSort())).toStrictEqual([
      'Brocfile.js',
      'lib/a.js',
      'index.js',
      'test/sample.test.js',
    ]);
  });

  test('options.exclude', () => {
    const baseDir = getLibrary('simple');

    const projectGraph = new ProjectGraph(baseDir, { exclude: ['test'] });
    const [somePackage] = projectGraph.discover();
    expect(flatten(somePackage.getModuleGraph().topSort())).toStrictEqual(['lib/a.js', 'index.js']);
  });

  describe('workspaces', () => {
    test('should discover all packages in the project', () => {
      const baseDir = getLibrary('library-with-workspaces');

      const projectGraph = new ProjectGraph(baseDir);
      projectGraph.discover();

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
        'some-library-with-workspace', // Root Pacakge is last.
      ]);

      const [package0, package1, package2, package3, package4] = sortedPackages.map(
        (node) => node.content.pkg
      );

      expect(flatten(package0.getModuleGraph().topSort())).toStrictEqual([]);
      expect(flatten(package1.getModuleGraph().topSort())).toStrictEqual([
        'build.js',
        'lib/impl.js',
        'index.js',
      ]);
      expect(flatten(package2.getModuleGraph().topSort())).toStrictEqual([]);
      expect(flatten(package3.getModuleGraph().topSort())).toStrictEqual(['lib/a.js', 'index.js']);
      expect(flatten(package4.getModuleGraph().topSort())).toStrictEqual(['some-util.js']);
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
    test('should not include a file out of the package scope', () => {
      const baseDir = getLibrary('workspace-with-package-scope-issue');

      const projectGraph = new ProjectGraph(baseDir);
      projectGraph.discover();

      const rootNode = projectGraph.graph.getNode('root-package');
      const branchNode = projectGraph.graph.getNode('@some-workspace/branch');
      const leafNode = projectGraph.graph.getNode('@some-workspace/leaf');

      // Validate edges
      expect(rootNode.adjacent.has(branchNode)).toBe(true);
      expect(rootNode.adjacent.has(leafNode)).toBe(true);
      expect(branchNode.adjacent.has(leafNode)).toBe(true);

      // Validate graph order correctness
      const nodes = projectGraph.graph.topSort().map((node) => node.content.pkg);

      expect(nodes.length).toBe(3);

      expect(nodes[0].packageName).toBe('@some-workspace/leaf');
      expect(flatten(nodes[0].getModuleGraph().topSort())).toStrictEqual([
        'build.js',
        'lib/impl.js',
        'index.js',
      ]);
      expect(nodes[1].packageName).toBe('@some-workspace/branch');
      expect(flatten(nodes[1].getModuleGraph().topSort())).toStrictEqual([
        'build.js',
        'lib/a.js',
        'index.js',
      ]);
      expect(nodes[2].packageName).toBe('root-package');
      expect(flatten(nodes[2].getModuleGraph().topSort())).toStrictEqual(['some-shared-util.js']);
    });
    test.todo('should do something if a cycle is found', () => {
      expect(true).toBe(false);
    });
  });
});
