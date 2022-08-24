import path from 'path';
import swc from '@swc/core';
import { FileNode } from './types';
import Graph from './utils/graph';
import GraphNode from './utils/graph-node';

import { resolveRelativeModule } from './module-resolution';

export async function createImportGraph(
  baseUrl: string,
  entrypoint?: string | undefined
): Promise<Graph<FileNode>> {
  const g = new Graph<FileNode>();

  let entryFilePath;

  try {
    entryFilePath = resolveRelativeModule(entrypoint, { currentDir: baseUrl });
  } catch (e) {
    throw new Error(`Unknown error occured: ${e} in file ${baseUrl}.`);
  }

  let queue: GraphNode<FileNode>[] = [];

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

    const currentDir = path.dirname(source);

    // parse file contents
    await swc
      .parseFile(source, {
        syntax: 'ecmascript',
      })
      .then((module) => {
        module.body.forEach((m: swc.ModuleItem) => {
          // console.log(m);

          switch (m.type) {
            case 'ExportAllDeclaration':
            case 'ExportNamedDeclaration':
            case 'ImportDeclaration':
              if (!m.source) {
                break;
              }

              const moduleName = m.source.value;

              let pathToModule;

              try {
                pathToModule = resolveRelativeModule(moduleName, {
                  currentDir,
                });
              } catch (e) {
                console.log(`Skip: ${e} in file ${source}.`);
                break;
              }

              const destNode = g.addNode({ key: pathToModule, path: pathToModule, parsed: false });

              g.addEdge(sourceNode, destNode);

              queue.push(destNode);
              break;
          }
        });
        sourceNode.content.parsed = true;
      });
  }

  return g;
}
