import fixturify from 'fixturify';
import { mkdirSync } from 'fs-extra';
import path from 'path';
import rimraf from 'rimraf';
import { dirSync, setGracefulCleanup } from 'tmp';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { createDependencyGraph } from '../src/file-dependency-graph/cruiser';
import { ModuleNode } from '../src/types';
import { Graph } from '../src/utils/graph';
import { GraphNode } from '../src/utils/graph-node';
import { getLibrarySimple } from './fixtures/library';

setGracefulCleanup();

function flatten(arr: GraphNode<ModuleNode>[]): Array<string> {
  return Array.from(arr).map((n) => n.content.path);
}

describe('createDependencyGraph', () => {
  const testSuiteTmpDir = path.join(process.cwd(), 'tmp');

  function getTmpDir(): string {
    const { name: tmpDir } = dirSync({ tmpdir: testSuiteTmpDir });
    return tmpDir;
  }

  beforeAll(() => {
    rimraf.sync(testSuiteTmpDir);
    mkdirSync(testSuiteTmpDir);
  });

  afterAll(() => {
    rimraf.sync(testSuiteTmpDir);
  });

  test('should construct a graph; simple', async () => {
    const tmpDir = getTmpDir();

    const files = {
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

    const output: Graph<ModuleNode> = createDependencyGraph(tmpDir);

    expect(flatten(output.topSort())).toStrictEqual(flatten(g.topSort()));
  });

  test('should dedupe nodes e.g. reused imports', async () => {
    const tmpDir = getTmpDir();

    const files = {
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

    const output: Graph<ModuleNode> = createDependencyGraph(tmpDir);

    expect(flatten(output.topSort())).toStrictEqual(flatten(g.topSort()));
  });

  test('should handle circular dependencies', async () => {
    const tmpDir = getTmpDir();

    const files = {
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

    const output: Graph<ModuleNode> = createDependencyGraph(tmpDir);
    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/a.js', 'lib/b.js', 'index.js']);
  });

  test('should handle re-exporting', async () => {
    const tmpDir = getTmpDir();

    const files = {
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

    const output: Graph<ModuleNode> = createDependencyGraph(tmpDir);

    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/file.js', 'index.js']);
  });

  test("should handle aggregating exports e.g. '*' ", async () => {
    const tmpDir = getTmpDir();

    const files = {
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

    const output: Graph<ModuleNode> = createDependencyGraph(tmpDir);

    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/phrases.js', 'index.js']);
  });

  test("should handle aggregating exports e.g. '* as phrases' ", async () => {
    const tmpDir = getTmpDir();

    const files = {
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

    const output: Graph<ModuleNode> = createDependencyGraph(tmpDir);

    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['lib/phrases.js', 'index.js']);
  });

  test('should ignore node_modules ', async () => {
    const baseUrl = getLibrarySimple();
    const output: Graph<ModuleNode> = createDependencyGraph(baseUrl);
    const actual = flatten(output.topSort());
    expect(actual).toStrictEqual(['lib/a.js', 'index.js']);
  });

  test('should detect file extension in moduleName', async () => {
    const tmpDir = getTmpDir();

    const files = {
      'index.js': `
        import './a.js';
        `,
      'a.js': ``,
    };

    fixturify.writeSync(tmpDir, files);

    const output: Graph<ModuleNode> = createDependencyGraph(tmpDir);

    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['a.js', 'index.js']);
  });

  test('should resolve a directory with package.json and main entry', async () => {
    const tmpDir = getTmpDir();

    const files = {
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

    const output: Graph<ModuleNode> = createDependencyGraph(tmpDir);

    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['some-dir/not-obvious.js', 'index.js']);
  });
});
