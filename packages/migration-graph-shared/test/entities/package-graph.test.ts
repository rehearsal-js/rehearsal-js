import { join } from 'path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { getLibrary } from '@rehearsal/test-support';
import fixturify from 'fixturify';
import { mkdirSync } from 'fs-extra';
import rimraf from 'rimraf';
import { dirSync, setGracefulCleanup } from 'tmp';
import { Package } from '../../src/entities/package';
import { Graph, GraphNode } from '../../src/graph';
import { PackageGraph } from '../../src/entities/package-graph';
import { Logger } from '../../src/utils/logger';
import type { ModuleNode, PackageNode } from '../../src/types';

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
    rimraf.sync(testSuiteTmpDir);
    mkdirSync(testSuiteTmpDir);
  });

  afterAll(() => {
    rimraf.sync(testSuiteTmpDir);
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

    const logger = new Logger();

    const baseDir = join(tmpDir, 'some-dir');
    const output: Graph<ModuleNode> = new PackageGraph(new Package(baseDir), { logger }).discover();

    expect.assertions(3);

    const actual = flatten(output.topSort());

    expect(actual).toStrictEqual(['index.js']);

    const sourcePath = 'index.js';
    const targetPath = '../out-of-package.js';

    expect(logger.entries[0]).toStrictEqual({
      severity: 'warn',
      message: `The source file "${sourcePath}" is importing a file "${targetPath}" that is external to "${packageName}" package directory (${baseDir}), omitting target file ("${targetPath}") form package-graph.`,
    });
    expect(logger.entries[1]).toStrictEqual({
      severity: 'warn',
      message: `The target file "${targetPath}" is external to package "${packageName}" (${baseDir}), omitting target file form package-graph.`,
    });
  });
});
