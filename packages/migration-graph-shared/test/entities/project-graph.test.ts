import { create, getLibrary } from '@rehearsal/test-support';
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
  test('should ignore `.<name>.js files (eg. .babelrc.js or .eslintrc.js)', () => {
    const baseDir = getLibrary('simple');

    const projectGraph = new ProjectGraph(baseDir);
    const somePackage = new Package(baseDir);
    projectGraph.addPackageToGraph(somePackage);
    projectGraph.discover();

    expect(flatten(somePackage.getModuleGraph().topSort())).toStrictEqual(['lib/a.js', 'index.js']);
  });

  test('should ignore .lock files', () => {
    const baseDir = getLibrary('library-with-ignored-files');

    // Add dummy lock files package-lock.json, npm-shrinkwrap.json package-lock.json, yarn.lock, pnpm-lock.yaml

    const projectGraph = new ProjectGraph(baseDir);
    projectGraph.discover();

    const somePackage = projectGraph.graph.topSort()[0].content.pkg;

    expect(flatten(somePackage.getModuleGraph().topSort())).toStrictEqual(['lib/a.js', 'index.js']);
  });

  test('library should ignore files', () => {
    const baseDir = getLibrary('library-with-ignored-files');
    const projectGraph = new ProjectGraph(baseDir);
    projectGraph.discover();

    const somePackage = projectGraph.graph.topSort()[0].content.pkg;

    const files = flatten(somePackage.getModuleGraph().topSort());

    expect(files).toStrictEqual(['lib/a.js', 'index.js']);
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
    test('should not include a file out of the package scope', () => {
      const files = {
        packages: {
          branch: {
            'package.json': `{
              "name": "@some-workspace/branch",
              "version": "1.0.0",
              "main": "index.js",
              "dependencies": {
                "@some-workspace/leaf": "*"
              }
            }`,
            'index.js': `
              import { do } from '@some-workspace/leaf';
              import './lib/a';
            `,
            'build.js': `import '../../some-shared-util';`,
            lib: {
              'a.js': `
              // a.js
              console.log('foo');
             `,
            },
          },
          leaf: {
            'package.json': `{
              "name": "@some-workspace/leaf",
              "version": "1.0.0",
              "main": "index.js"
            }`,
            'index.js': `
              import './lib/impl';
              export function do() { console.log(''); }
            `,
            'build.js': `import '../../some-shared-util';`,
            lib: {
              'impl.js': `
                // impl.js
              `,
            },
          },
        },
        'some-shared-util.js': '// something-shared',
        'package.json': `
          {
            "name": "root-package",
            "version": "1.0.0",
            "main": "index.js",
            "license": "MIT",
            "workspaces": [
              "packages/*"
            ]
          }    
        `,
      };

      // mutate a file to include a file from the root directory.

      const baseDir = create(files);

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
