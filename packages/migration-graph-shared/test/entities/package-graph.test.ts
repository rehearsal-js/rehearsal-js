import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { getLibrary } from '@rehearsal/test-support';
import fixturify from 'fixturify';
import { mkdirSync } from 'fs-extra/esm';
import { sync as rimraf } from 'rimraf';
import { dirSync, setGracefulCleanup } from 'tmp';
import { Package } from '../../src/entities/package.js';
import { Graph, GraphNode } from '../../src/graph/index.js';
import { PackageGraph } from '../../src/entities/package-graph.js';
import type { ModuleNode, PackageNode } from '../../src/types.js';

setGracefulCleanup();

function flatten(arr: GraphNode<ModuleNode | PackageNode>[]): Array<string> {
  return Array.from(arr).map((n) => {
    return n.content.key;
  });
}

describe('PackageGraph', () => {
  const testSuiteTmpDir = join(process.cwd(), 'tmp');

  function getTmpDir(): string {
    const { name: tmpDir } = dirSync({ tmpdir: testSuiteTmpDir });
    return tmpDir;
  }

  beforeAll(() => {
    rimraf(testSuiteTmpDir);
    mkdirSync(testSuiteTmpDir);
  });

  afterAll(() => {
    rimraf(testSuiteTmpDir);
  });

  test('should construct a graph; simple', async () => {
    const tmpDir = getTmpDir();

    const files = {
      'package.json': '{}',
      'index.js': `import './a'`,
      'a.js': `import './b'`,
      'b.js': ``,
    };

    fixturify.writeSync(tmpDir, files);

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

    const output: Graph<ModuleNode> = new PackageGraph(new Package(tmpDir)).discover();

    expect(flatten(output.topSort())).toStrictEqual(flatten(g.topSort()));
  });

  test('should dedupe nodes e.g. reused imports', async () => {
    const tmpDir = getTmpDir();

    const files = {
      'package.json': '{}',
      'index.js': `import './lib/a'; import './lib/b';`,
      lib: {
        'a.js': `import './b'`,
        'b.js': ``,
      },
    };

    fixturify.writeSync(tmpDir, files);

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

    const output: Graph<ModuleNode> = new PackageGraph(new Package(tmpDir)).discover();

    expect(flatten(output.topSort())).toStrictEqual(flatten(g.topSort()));
  });

  test('should handle circular dependencies', async () => {
    const tmpDir = getTmpDir();

    const files = {
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
    };

    fixturify.writeSync(tmpDir, files);

    const output: Graph<ModuleNode> = new PackageGraph(new Package(tmpDir)).discover();
    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/a.js', 'lib/b.js', 'index.js']);
  });

  test('should handle re-exporting', async () => {
    const tmpDir = getTmpDir();

    const files = {
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
    };

    fixturify.writeSync(tmpDir, files);

    const output: Graph<ModuleNode> = new PackageGraph(new Package(tmpDir)).discover();

    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/file.js', 'index.js']);
  });

  test("should handle aggregating exports e.g. '*' ", async () => {
    const tmpDir = getTmpDir();

    const files = {
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
    };

    fixturify.writeSync(tmpDir, files);

    const output: Graph<ModuleNode> = new PackageGraph(new Package(tmpDir)).discover();

    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/phrases.js', 'index.js']);
  });

  test("should handle aggregating exports e.g. '* as phrases' ", async () => {
    const tmpDir = getTmpDir();

    const files = {
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
    };

    fixturify.writeSync(tmpDir, files);

    const output: Graph<ModuleNode> = new PackageGraph(new Package(tmpDir)).discover();

    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/phrases.js', 'index.js']);
  });

  test('should ignore node_modules ', async () => {
    const baseDir = getLibrary('simple');
    const output: Graph<ModuleNode> = new PackageGraph(new Package(baseDir)).discover();
    const actual = flatten(output.topSort());
    expect(actual).toStrictEqual(['lib/a.js', 'index.js']);
  });

  test('should detect file extension in moduleName', async () => {
    const tmpDir = getTmpDir();

    const files = {
      'package.json': '{}',
      'index.js': `
        import './a.js';
        `,
      'a.js': ``,
    };

    fixturify.writeSync(tmpDir, files);

    const output: Graph<ModuleNode> = new PackageGraph(new Package(tmpDir)).discover();

    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['a.js', 'index.js']);
  });

  test('should resolve a directory with package.json and main entry', async () => {
    const tmpDir = getTmpDir();

    const files = {
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
    };

    fixturify.writeSync(tmpDir, files);

    const output: Graph<ModuleNode> = new PackageGraph(new Package(tmpDir)).discover();

    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['some-dir/not-obvious.js', 'index.js']);
  });

  test('should not include a file in the module graph if external to the package', () => {
    const tmpDir = getTmpDir();

    const packageName = 'my-package-name';

    const files = {
      'out-of-package.js': `const a = '1';`,
      'some-dir': {
        'package.json': JSON.stringify({
          name: packageName,
        }),
        'index.js': `import '../out-of-package.js';`,
      },
    };

    fixturify.writeSync(tmpDir, files);

    const baseDir = join(tmpDir, 'some-dir');
    const output: Graph<ModuleNode> = new PackageGraph(new Package(baseDir)).discover();

    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['index.js']);
  });

  test('should exclude *.json files from the module graph', () => {
    const tmpDir = getTmpDir();

    const files = {
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
    };

    fixturify.writeSync(tmpDir, files);

    const output: Graph<ModuleNode> = new PackageGraph(new Package(tmpDir)).discover();

    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/config.js', 'lib/impl.js', 'index.js']);
  });

  test('should exclude *.css from the module graph', () => {
    const tmpDir = getTmpDir();

    const files = {
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
    };

    fixturify.writeSync(tmpDir, files);

    const output: Graph<ModuleNode> = new PackageGraph(new Package(tmpDir)).discover();

    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/impl.js', 'index.js']);
  });

  test('should exclude *.graphql from the module graph', () => {
    const tmpDir = getTmpDir();

    const files = {
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
    };

    fixturify.writeSync(tmpDir, files);

    const output: Graph<ModuleNode> = new PackageGraph(new Package(tmpDir)).discover();

    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/impl.js', 'index.js']);
  });
});
