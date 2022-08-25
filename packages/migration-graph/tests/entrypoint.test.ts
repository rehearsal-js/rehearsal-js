import { describe, test, expect } from 'vitest';
import { createImportGraph } from '../src/entrypoint';
import { Graph } from '../src/utils/graph';
import { GraphNode } from '../src/utils/graph-node';
import tmp from 'tmp';
import path from 'path';
import fixturify from 'fixturify';
import { FileNode } from 'src/types';

tmp.setGracefulCleanup();

function flatten(arr: GraphNode<FileNode>[]): string[] {
  return Array.from(arr).map((n) => n.content.path);
}

function stripBaseUrl(arr: string[], baseUrl: string): string[] {
  return arr.map((str: string) => path.relative(baseUrl, str));
}

describe('createImportGraph', () => {
  test('should construct a graph; simple', async () => {
    const { name: tmpDir } = tmp.dirSync();

    const files = {
      'index.js': `import './a'`,
      'a.js': `import './b'`,
      'b.js': ``,
    };

    fixturify.writeSync(tmpDir, files);

    const g = new Graph<FileNode>();

    // index -> a -> b
    // index -> a -> b
    let filePath;
    filePath = path.join(tmpDir, 'index.js');
    const index = g.addNode({ key: filePath, path: filePath });
    filePath = path.join(tmpDir, 'a.js');
    const nodeA = g.addNode({ key: filePath, path: filePath });
    filePath = path.join(tmpDir, 'b.js');
    const nodeB = g.addNode({ key: filePath, path: filePath });

    g.addEdge(index, nodeA);
    g.addEdge(nodeA, nodeB);

    const output: Graph<FileNode> = await createImportGraph(tmpDir);

    expect(flatten(output.topSort())).toStrictEqual(flatten(g.topSort()));
  });

  test('should dedupe nodes e.g. reused imports', async () => {
    const { name: tmpDir } = tmp.dirSync();

    const files = {
      'index.js': `import './lib/a'; import './lib/b';`,
      lib: {
        'a.js': `import './b'`,
        'b.js': ``,
      },
    };

    fixturify.writeSync(tmpDir, files);

    const g = new Graph<FileNode>();

    // index -> a -> b
    let filePath;
    filePath = path.join(tmpDir, 'index.js');
    const index = g.addNode({ key: filePath, path: filePath });
    filePath = path.join(tmpDir, 'lib/a.js');
    const nodeA = g.addNode({ key: filePath, path: filePath });
    filePath = path.join(tmpDir, 'lib/b.js');
    const nodeB = g.addNode({ key: filePath, path: filePath });

    g.addEdge(index, nodeA);
    g.addEdge(index, nodeB);
    g.addEdge(nodeA, nodeB);

    const output: Graph<FileNode> = await createImportGraph(tmpDir);

    expect(flatten(output.topSort())).toStrictEqual(flatten(g.topSort()));
  });

  test('should handle circular dependencies', async () => {
    const { name: tmpDir } = tmp.dirSync();

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

    const output: Graph<FileNode> = await createImportGraph(tmpDir);
    const actual = stripBaseUrl(flatten(output.topSort()), tmpDir);

    expect(actual).toStrictEqual(['lib/a.js', 'lib/b.js', 'index.js']);
  });

  test('should handle re-exporting', async () => {
    const { name: tmpDir } = tmp.dirSync();

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

    const output: Graph<FileNode> = await createImportGraph(tmpDir);

    const actual = stripBaseUrl(flatten(output.topSort()), tmpDir);

    expect(actual).toStrictEqual(['lib/file.js', 'index.js']);
  });

  test("should handle aggregating exports e.g. '*' ", async () => {
    const { name: tmpDir } = tmp.dirSync();

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

    const output: Graph<FileNode> = await createImportGraph(tmpDir);

    const actual = stripBaseUrl(flatten(output.topSort()), tmpDir);

    expect(actual).toStrictEqual(['lib/phrases.js', 'index.js']);
  });

  test("should handle aggregating exports e.g. '* as phrases' ", async () => {
    const { name: tmpDir } = tmp.dirSync();

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

    const output: Graph<FileNode> = await createImportGraph(tmpDir);

    const actual = stripBaseUrl(flatten(output.topSort()), tmpDir);

    expect(actual).toStrictEqual(['lib/phrases.js', 'index.js']);
  });

  test('should ignore node_modules ', async () => {
    const baseUrl = path.resolve(__dirname, '../../../test-packages/test-ignore-node-modules');
    const output: Graph<FileNode> = await createImportGraph(baseUrl);
    const actual = stripBaseUrl(flatten(output.topSort()), baseUrl);
    expect(actual).toStrictEqual(['lib/a.js', 'index.js']);
  });

  test('should detect file extension in moduleName', async () => {
    const { name: tmpDir } = tmp.dirSync();

    const files = {
      'index.js': `
        import './a.js';
        `,
      'a.js': ``,
    };

    fixturify.writeSync(tmpDir, files);

    const output: Graph<FileNode> = await createImportGraph(tmpDir);

    const actual = stripBaseUrl(flatten(output.topSort()), tmpDir);

    expect(actual).toStrictEqual(['a.js', 'index.js']);
  });

  test('should resolve a directory with package.json and main entry', async () => {
    const { name: tmpDir } = tmp.dirSync();

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

    const output: Graph<FileNode> = await createImportGraph(tmpDir);

    const actual = stripBaseUrl(flatten(output.topSort()), tmpDir);

    expect(actual).toStrictEqual(['some-dir/not-obvious.js', 'index.js']);
  });

  test.skip('provide graph for a complex library', async () => {
    const baseUrl = '/path/to/library'; // replace to
    const output: Graph<FileNode> = await createImportGraph(baseUrl, './src/index.js');

    console.log(stripBaseUrl(flatten(output.topSort()), baseUrl));

    expect(true).toBe(false);
  });
});
