import { join } from 'path';
import { describe, expect, test, afterEach } from 'vitest';
import { getFiles } from '@rehearsal/test-support';
import { Project } from 'fixturify-project';
import { Package } from '../../src/entities/package.js';
import { Graph, GraphNode } from '../../src/graph/index.js';
import { PackageGraph } from '../../src/entities/package-graph.js';

import type { ModuleNode, PackageNode } from '../../src/types.js';

function flatten(arr: GraphNode<ModuleNode | PackageNode>[]): Array<string> {
  return Array.from(arr).map((n) => {
    return n.content.key;
  });
}

describe('PackageGraph', () => {
  let project: Project;

  afterEach(() => {
    project.dispose();
  });

  test('should construct a graph; simple', async () => {
    project = new Project('my-package', '0.0.0', {
      files: {
        'index.js': `import './a'`,
        'a.js': `import './b'`,
        'b.js': ``,
        'package.json': `
          {}
        `,
      },
    });

    await project.write();

    const g = new Graph<ModuleNode>();

    // index -> a -> b
    // index -> a -> b
    let filePath;
    filePath = 'index.js';
    const index = g.addNode({ key: filePath, path: filePath });
    filePath = 'a.js';
    const nodeA = g.addNode({ key: filePath, path: filePath });
    filePath = 'b.js';
    const nodeB = g.addNode({ key: filePath, path: filePath });

    g.addEdge(index, nodeA);
    g.addEdge(nodeA, nodeB);

    const output: Graph<ModuleNode> = new PackageGraph(new Package(project.baseDir)).discover();

    expect(flatten(output.topSort())).toStrictEqual(flatten(g.topSort()));
  });

  test('should dedupe nodes e.g. reused imports', async () => {
    project = new Project('my-package', '0.0.0', {
      files: {
        'package.json': '{}',
        'index.js': `import './lib/a'; import './lib/b';`,
        lib: {
          'a.js': `import './b'`,
          'b.js': ``,
        },
      },
    });

    await project.write();

    const g = new Graph<ModuleNode>();

    // index -> a -> b
    let filePath;
    filePath = 'index.js';
    const index = g.addNode({ key: filePath, path: filePath });
    filePath = 'lib/a.js';
    const nodeA = g.addNode({ key: filePath, path: filePath });
    filePath = 'lib/b.js';
    const nodeB = g.addNode({ key: filePath, path: filePath });

    g.addEdge(index, nodeA);
    g.addEdge(index, nodeB);
    g.addEdge(nodeA, nodeB);

    const output: Graph<ModuleNode> = new PackageGraph(new Package(project.baseDir)).discover();

    expect(flatten(output.topSort())).toStrictEqual(flatten(g.topSort()));
  });

  test('should handle circular dependencies', async () => {
    project = new Project('my-package', '0.0.0', {
      files: {
        'package.json': '{}',
        'index.js': `
            import './lib/b';
            `,
        lib: {
          'a.js': `
              import './b';
            `,
          'b.js': `
              import './a';
            `,
        },
      },
    });

    await project.write();

    const output: Graph<ModuleNode> = new PackageGraph(new Package(project.baseDir)).discover();
    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/a.js', 'lib/b.js', 'index.js']);
  });

  test('should handle re-exporting', async () => {
    project = new Project('my-package', '0.0.0', {
      files: {
        'package.json': '{}',
        'index.js': `
          export { foo } from './lib/file';
          `,
        lib: {
          'file.js': `
            const foo = 2;
            export { foo }
          `,
        },
      },
    });

    await project.write();

    const output: Graph<ModuleNode> = new PackageGraph(new Package(project.baseDir)).discover();
    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/file.js', 'index.js']);
  });

  test("should handle aggregating exports e.g. '*' ", async () => {
    project = new Project('my-package', '0.0.0', {
      files: {
        'package.json': '{}',
        'index.js': `
          export * from './lib/phrases';
          `,
        lib: {
          'phrases.js': `
            const phrase1 = 'hello';
            const phrase2 = 'hola';
            const phrase3 = 'ciao';
            export { foo, bar, gnar }
          `,
        },
      },
    });

    await project.write();

    const output: Graph<ModuleNode> = new PackageGraph(new Package(project.baseDir)).discover();
    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/phrases.js', 'index.js']);
  });

  test("should handle aggregating exports e.g. '* as phrases' ", async () => {
    project = new Project('my-package', '0.0.0', {
      files: {
        'package.json': '{}',
        'index.js': `
          export * as phrases from './lib/phrases';
          `,
        lib: {
          'phrases.js': `
            const phrase1 = 'hello';
            const phrase2 = 'hola';
            const phrase3 = 'ciao';
            export { phrase1, phrase2, phrase3 }
          `,
        },
      },
    });

    await project.write();

    const output: Graph<ModuleNode> = new PackageGraph(new Package(project.baseDir)).discover();
    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/phrases.js', 'index.js']);
  });

  test('should ignore node_modules ', async () => {
    project = new Project('my-package', '0.0.0', {
      files: getFiles('simple'),
    });

    await project.write();

    const output: Graph<ModuleNode> = new PackageGraph(new Package(project.baseDir)).discover();
    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/a.js', 'index.js']);
  });

  test('should detect file extension in moduleName', async () => {
    project = new Project('my-package', '0.0.0', {
      files: {
        'package.json': '{}',
        'index.js': `
          import './a.js';
          `,
        'a.js': ``,
      },
    });

    await project.write();

    const output: Graph<ModuleNode> = new PackageGraph(new Package(project.baseDir)).discover();
    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['a.js', 'index.js']);
  });

  test('should resolve a directory with package.json and main entry', async () => {
    project = new Project('my-package', '0.0.0', {
      files: {
        'package.json': '{}',
        'index.js': `
          import './some-dir';
          `,
        'some-dir': {
          'package.json': JSON.stringify({
            main: 'not-obvious.js',
          }),
          'not-obvious.js': `console.log('hello');`,
        },
      },
    });

    await project.write();

    const output: Graph<ModuleNode> = new PackageGraph(new Package(project.baseDir)).discover();
    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['some-dir/not-obvious.js', 'index.js']);
  });

  test('should not include a file in the module graph if external to the package', async () => {
    const packageName = 'my-package-name';

    project = new Project('my-package', '0.0.0', {
      files: {
        'out-of-package.js': `const a = '1';`,
        'some-dir': {
          'package.json': JSON.stringify({
            name: packageName,
          }),
          'index.js': `import '../out-of-package.js';`,
        },
      },
    });

    await project.write();

    const output: Graph<ModuleNode> = new PackageGraph(
      new Package(join(project.baseDir, 'some-dir'))
    ).discover();
    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['index.js']);
  });

  test('should exclude *.json files from the module graph', async () => {
    project = new Project('my-package', '0.0.0', {
      files: {
        lib: {
          'config.js': `import conf from './config.json`,
          'config.json': `{ name: 'my-config' }`,
          'impl.js': `import pkg from '../package.json';`,
          'member.graphql': '',
          'main.css': '',
        },
        'index.js': `
          import path from 'path';
          import data from './lib/member.graphql';
          import styles from './lib/main.css';
          import pkg from './package';
          import impl from './lib/impl;

          export * from './lib/config';
          export * from './lib/impl';
        `,
        'package.json': `
          {
            "name": "basic",
            "version": "1.0.0",
            "license": "MIT"
          }
        `,
      },
    });

    await project.write();

    const output: Graph<ModuleNode> = new PackageGraph(new Package(project.baseDir)).discover();
    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/config.js', 'lib/impl.js', 'index.js']);
  });

  test('should exclude *.css from the module graph', async () => {
    project = new Project('my-package', '0.0.0', {
      files: {
        lib: {
          'member.css': '',
          'impl.js': `import './member'`,
        },
        'index.js': `
          import './lib/member.css';
          import './lib/impl';
        `,
        'package.json': `
          {
            "name": "basic",
            "version": "1.0.0",
            "license": "MIT"
          }
        `,
      },
    });

    await project.write();

    const output: Graph<ModuleNode> = new PackageGraph(new Package(project.baseDir)).discover();
    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/impl.js', 'index.js']);
  });

  test('should exclude *.graphql from the module graph', async () => {
    project = new Project('my-package', '0.0.0', {
      files: {
        lib: {
          'member.graphql': '',
          'impl.js': `import './member'`,
        },
        'index.js': `
          import './lib/member.graphql';
          import './lib/impl';
        `,
        'package.json': `
          {
            "name": "basic",
            "version": "1.0.0",
            "license": "MIT"
          }
        `,
      },
    });

    await project.write();

    const output: Graph<ModuleNode> = new PackageGraph(new Package(project.baseDir)).discover();
    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/impl.js', 'index.js']);
  });
});
