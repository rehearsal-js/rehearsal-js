import type { ModuleItem } from '@swc/core';
import { parseFileSync } from '@swc/core';
import debug from 'debug';
import { dirname } from 'path';

import { resolveRelativeModule } from '../module-resolution';
import type { ModuleNode } from '../types';
import { Graph } from '../utils/graph';
import { GraphNode } from '../utils/graph-node';

const DEBUG_CALLBACK = debug('rehearsal:migration-grap:create-dependency-graph:basic');

export function createDependencyGraph(baseDir: string, entrypoint = './index'): Graph<ModuleNode> {
  const g = new Graph<ModuleNode>();

  let entryFilePath;

  try {
    entryFilePath = resolveRelativeModule(entrypoint, { currentDir: baseDir });
  } catch (e) {
    throw new Error(`Unknown error occured: ${e} in file: ${baseDir}`);
  }

  const queue: GraphNode<ModuleNode>[] = [];

  queue.push(g.addNode({ key: entryFilePath, path: entryFilePath, parsed: false }));

  while (queue.length > 0) {
    const sourceNode = queue.shift(); // Take the first item off the queue

    if (!sourceNode) {
      throw new Error('Unknown error occured');
    }

    // If this node has been parsed (e.g. visited), we skip as it's already been added to the graph.
    if (sourceNode.content.parsed) {
      continue;
    }

    const source = sourceNode.content.path;
    const currentDir = dirname(source);
    const module = parseFileSync(source, { syntax: 'ecmascript' });

    module.body.forEach((m: ModuleItem) => {
      switch (m.type) {
        case 'ExportAllDeclaration':
        case 'ExportNamedDeclaration':
        case 'ImportDeclaration':
          if (!m.source) {
            break;
          }

          try {
            const pathToModule = resolveRelativeModule(m.source.value, {
              currentDir,
            });
            const destNode = g.addNode({
              key: pathToModule,
              path: pathToModule,
              parsed: false,
            });
            g.addEdge(sourceNode, destNode);
            queue.push(destNode);
          } catch (e) {
            DEBUG_CALLBACK(`Skip: ${e} in file ${source}.`);
            break;
          }

          break;
      }
    });

    sourceNode.content.parsed = true;
  }

  return g;
}
