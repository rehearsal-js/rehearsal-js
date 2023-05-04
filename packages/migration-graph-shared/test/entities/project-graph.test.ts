import { getFiles } from '@rehearsal/test-support';
import { afterEach, describe, expect, test } from 'vitest';
import { Project } from 'fixturify-project';
import { ProjectGraph } from '../../src/entities/project-graph.js';
import { onlyPackage, Package } from '../../src/entities/package.js';
import type { GraphNode } from '../../src/graph/node.js';
import type { ModuleNode, PackageNode } from '../../src/types.js';

function flatten(arr: GraphNode<ModuleNode | PackageNode>[]): Array<string> {
  return Array.from(arr).map((n) => {
    return n.content.key;
  });
}

describe('project-graph', () => {
  let project: Project;
  const EXPECTED_FILES = ['lib/a.js', 'index.js', 'test/sample.test.js'];

  afterEach(() => {
    project.dispose();
  });

  test('should create a graph', async () => {
    project = new Project('my-package', '0.0.0', {
      files: getFiles('library-with-tests'),
    });

    await project.write();

    const projectGraph = new ProjectGraph(project.baseDir);
    projectGraph.discover(true, true);

    expect.assertions(6);

    expect(projectGraph.graph.hasNode('my-package')).toBe(true);
    expect(projectGraph.sourceType).toBe('JavaScript Library');
    const ordered = projectGraph.graph.getSortedNodes();
    expect(flatten(ordered)).toStrictEqual(['my-package']);
    const packageNode = ordered[0];
    const somePackage = packageNode.content.pkg;

    expect(somePackage?.hasModuleGraph()).toBe(false);
    const moduleGraphForPackage = somePackage?.getModuleGraph({
      basePath: project.baseDir,
    }); // Forces creation of moduleGraph
    expect(somePackage?.hasModuleGraph()).toBe(true);
    expect(flatten(moduleGraphForPackage?.getSortedNodes() || [])).toStrictEqual(EXPECTED_FILES);
  });

  test('should ignore `.<name>.js files (eg. .babelrc.js or .eslintrc.js)', async () => {
    project = new Project('my-package', '0.0.0', {
      files: getFiles('library-with-ignored-files'),
    });

    await project.write();

    const projectGraph = new ProjectGraph(project.baseDir);
    projectGraph.discover(true, true);
    const somePackage = projectGraph.graph.getSortedNodes()[0].content.pkg;

    expect(
      flatten(
        somePackage
          ?.getModuleGraph({
            basePath: project.baseDir,
          })
          .getSortedNodes() || []
      )
    ).toStrictEqual(EXPECTED_FILES);
  });

  test('should ignore .lock files', async () => {
    project = new Project('my-package', '0.0.0', {
      files: getFiles('library-with-ignored-files'),
    });

    await project.write();

    const projectGraph = new ProjectGraph(project.baseDir);
    projectGraph.discover(true, true);

    const somePackage = projectGraph.graph.getSortedNodes()[0].content.pkg;

    expect(
      flatten(
        somePackage
          ?.getModuleGraph({
            basePath: project.baseDir,
          })
          .getSortedNodes() || []
      )
    ).toStrictEqual(EXPECTED_FILES);
  });

  test('library should ignore files', async () => {
    project = new Project('my-package', '0.0.0', {
      files: getFiles('library-with-ignored-files'),
    });

    await project.write();

    const projectGraph = new ProjectGraph(project.baseDir);
    projectGraph.discover(true, true);

    const somePackage = projectGraph.graph.getSortedNodes()[0].content.pkg;

    const files = flatten(
      somePackage
        ?.getModuleGraph({
          basePath: project.baseDir,
        })
        .getSortedNodes() || []
    );

    expect(files).toStrictEqual(['lib/a.js', 'index.js', 'test/sample.test.js']);
  });

  test('should include loose files in rootDir', async () => {
    project = new Project('my-package-with-loose-files', '0.0.0', {
      files: getFiles('library-with-loose-files'),
    });

    await project.write();

    const projectGraph = new ProjectGraph(project.baseDir);
    projectGraph.discover(true, true);

    expect(projectGraph.graph.hasNode('my-package-with-loose-files')).toBe(true);
    expect(flatten(projectGraph.graph.getSortedNodes())).toStrictEqual([
      'my-package-with-loose-files',
    ]);
    expect(
      flatten(
        projectGraph.graph
          .getSortedNodes()[0]
          .content.pkg?.getModuleGraph({
            basePath: project.baseDir,
          })
          .getSortedNodes() || []
      )
    ).toStrictEqual([
      'Events.js',
      'utils/Defaults.js',
      'State.js',
      'Widget.js',
      'WidgetManager.js',
      'index.js',
    ]);
  });

  test('options.eager', async () => {
    project = new Project('my-package', '0.0.0', {
      files: getFiles('simple'),
    });

    await project.write();

    let projectGraph, somePackage;

    // In the eager test, we're not trying to validate discover() logic
    // We're trying to see once a package is added, that it's source moduleGraph
    // is created before access via somePackage.moduleGraph();

    projectGraph = new ProjectGraph(project.baseDir);
    projectGraph.discover(true, true);
    somePackage = projectGraph.graph.getNode('my-package').content.pkg;
    expect(somePackage?.hasModuleGraph(), 'should not exist by default').toBe(false);

    projectGraph = new ProjectGraph(project.baseDir, {
      basePath: project.baseDir,
      eager: true,
    });
    projectGraph.discover(true, true);
    somePackage = projectGraph.graph.getNode('my-package').content.pkg;
    expect(somePackage?.hasModuleGraph(), 'should exist when options.eager=true').toBe(true);
  });

  describe('options.entrypoint', () => {
    test('should work with a file', async () => {
      project = new Project('my-package', '0.0.0', {
        files: getFiles('simple'),
      });

      await project.write();
      let projectGraph: ProjectGraph, sortedPackages: Package[], orderedFiles;

      projectGraph = new ProjectGraph(project.baseDir, {
        basePath: project.baseDir,
        entrypoint: 'index.js',
      });
      projectGraph.discover(true, true);

      const sorted = projectGraph.graph.getSortedNodes();

      sortedPackages = Array.from(sorted)
        .map((node) => node.content.pkg)
        .filter(onlyPackage);

      orderedFiles = sortedPackages.reduce((allFiles, p) => {
        const files = flatten(p.getModuleGraph({ basePath: project.baseDir }).getSortedNodes());
        return [...allFiles, ...files];
      }, new Array<string>());

      expect(orderedFiles).toStrictEqual(['lib/a.js', 'index.js']);

      projectGraph = new ProjectGraph(project.baseDir, {
        basePath: project.baseDir,
        entrypoint: './index.js',
      });
      projectGraph.discover(true, true);

      sortedPackages = Array.from(projectGraph.graph.getSortedNodes())
        .map((node) => node.content.pkg)
        .filter(onlyPackage);

      orderedFiles = sortedPackages.reduce((allFiles, p) => {
        const files = flatten(
          p.getModuleGraph({ basePath: project.baseDir }).getSortedNodes() || []
        );
        return [...allFiles, ...files];
      }, new Array<string>());

      expect(orderedFiles).toStrictEqual(['lib/a.js', 'index.js']);
    });

    test('should work with a directory', async () => {
      project = new Project('my-package', '0.0.0', {
        files: getFiles('library-with-workspaces'),
      });

      await project.write();

      const projectGraph = new ProjectGraph(project.baseDir, {
        entrypoint: 'packages/foo/index.js',
        basePath: project.baseDir,
      });
      projectGraph.discover(true, true);

      const orderedPackages = Array.from(projectGraph.graph.getSortedNodes())
        .map((node) => node.content.pkg)
        .filter(onlyPackage);

      const orderedFiles = orderedPackages.reduce((allFiles, p) => {
        const moduleNodes = Array.from(
          p.getModuleGraph({ basePath: project.baseDir }).getSortedNodes()
        );
        const files = moduleNodes.map((moduleNode) => moduleNode.content.path);
        return [...allFiles, ...files];
      }, new Array<string>());

      expect(orderedFiles).toStrictEqual(['packages/foo/lib/a.js', 'packages/foo/index.js']);
    });

    test('options.include', async () => {
      project = new Project('my-package', '0.0.0', {
        files: getFiles('library-with-ignored-files'),
      });

      await project.write();

      const projectGraph = new ProjectGraph(project.baseDir, {
        include: ['Brocfile.js'],
        basePath: project.baseDir,
      });
      const [somePackage] = projectGraph.discover(true, true);
      expect(
        flatten(somePackage.getModuleGraph({ basePath: project.baseDir }).getSortedNodes())
      ).toStrictEqual(['Brocfile.js', 'lib/a.js', 'index.js', 'test/sample.test.js']);
    });

    test('options.exclude', async () => {
      project = new Project('my-package', '0.0.0', {
        files: getFiles('simple'),
      });

      await project.write();

      const projectGraph = new ProjectGraph(project.baseDir, {
        basePath: project.baseDir,
        exclude: ['test'],
      });
      const [somePackage] = projectGraph.discover(true, true);
      expect(
        flatten(somePackage.getModuleGraph({ basePath: project.baseDir }).getSortedNodes())
      ).toStrictEqual(['lib/a.js', 'index.js']);
    });
  });

  describe('workspaces', () => {
    test('should discover all packages in the project', async () => {
      project = new Project('some-library-with-workspace', '0.0.0', {
        files: getFiles('library-with-workspaces'),
      });

      await project.write();
      const projectGraph = new ProjectGraph(project.baseDir, {
        basePath: project.baseDir,
      });
      projectGraph.discover(true, true);

      expect(projectGraph.graph.hasNode('some-library-with-workspace')).toBe(true);
      expect(projectGraph.graph.hasNode('@something/foo')).toBe(true);
      expect(projectGraph.graph.hasNode('@something/bar')).toBe(true);
      expect(projectGraph.graph.hasNode('@something/baz')).toBe(true);
      expect(projectGraph.graph.hasNode('@something/blorp')).toBe(true);

      const sortedPackages = projectGraph.graph.getSortedNodes();

      expect(flatten(sortedPackages)).toStrictEqual([
        '@something/baz',
        '@something/blorp',
        '@something/bar',
        '@something/foo',
        'some-library-with-workspace', // Root Package is last.
      ]);

      const [package0, package1, package2, package3, package4] = sortedPackages
        .map((node) => node.content.pkg)
        .filter(onlyPackage);

      expect(
        flatten(package0.getModuleGraph({ basePath: project.baseDir }).getSortedNodes())
      ).toStrictEqual([]);
      expect(
        flatten(package1.getModuleGraph({ basePath: project.baseDir }).getSortedNodes())
      ).toStrictEqual(['build.js', 'lib/impl.js', 'index.js']);
      expect(
        flatten(package2.getModuleGraph({ basePath: project.baseDir }).getSortedNodes())
      ).toStrictEqual([]);
      expect(
        flatten(package3.getModuleGraph({ basePath: project.baseDir }).getSortedNodes())
      ).toStrictEqual(['lib/a.js', 'index.js']);
      expect(
        flatten(package4.getModuleGraph({ basePath: project.baseDir }).getSortedNodes())
      ).toStrictEqual(['index.js', 'some-util.js']);
    });
    test('should find edges between packages', async () => {
      project = new Project('my-package', '0.0.0', {
        files: getFiles('library-with-workspaces'),
      });

      await project.write();
      const projectGraph = new ProjectGraph(project.baseDir, {
        basePath: project.baseDir,
      });
      projectGraph.discover(true, true);

      const fooNode = projectGraph.graph.getNode('@something/foo');
      const barNode = projectGraph.graph.getNode('@something/bar');
      const bazNode = projectGraph.graph.getNode('@something/baz');
      const blorpNode = projectGraph.graph.getNode('@something/blorp');

      expect(fooNode.adjacent.has(barNode)).toBe(true);
      expect(barNode.adjacent.has(bazNode)).toBe(true);
      expect(barNode.adjacent.has(blorpNode)).toBe(true);
    });
    test('should not include a file out of the package scope', async () => {
      project = new Project('root-package', '0.0.0', {
        files: getFiles('workspace-with-package-scope-issue'),
      });

      await project.write();

      const projectGraph = new ProjectGraph(project.baseDir, {
        basePath: project.baseDir,
      });
      projectGraph.discover(true, true);

      const rootNode = projectGraph.graph.getNode('root-package');
      const branchNode = projectGraph.graph.getNode('@some-workspace/branch');
      const leafNode = projectGraph.graph.getNode('@some-workspace/leaf');

      // Validate edges
      expect(rootNode.adjacent.has(branchNode)).toBe(true);
      expect(rootNode.adjacent.has(leafNode)).toBe(true);
      expect(branchNode.adjacent.has(leafNode)).toBe(true);

      // Validate graph order correctness
      const nodes = projectGraph.graph
        .getSortedNodes()
        .map((node) => node.content.pkg)
        .filter(onlyPackage);

      expect(nodes.length).toBe(3);

      expect(nodes[0].packageName).toBe('@some-workspace/leaf');
      expect(
        flatten(nodes[0].getModuleGraph({ basePath: project.baseDir }).getSortedNodes())
      ).toStrictEqual(['build.js', 'lib/impl.js', 'index.js']);
      expect(nodes[1].packageName).toBe('@some-workspace/branch');
      expect(
        flatten(nodes[1].getModuleGraph({ basePath: project.baseDir }).getSortedNodes())
      ).toStrictEqual(['build.js', 'lib/a.js', 'index.js']);
      expect(nodes[2].packageName).toBe('root-package');
      expect(
        flatten(nodes[2].getModuleGraph({ basePath: project.baseDir }).getSortedNodes())
      ).toStrictEqual(['index.js', 'some-shared-util.js']);
    });
  });
});
