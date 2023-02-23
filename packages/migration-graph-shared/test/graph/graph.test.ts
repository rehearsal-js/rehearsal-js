import { describe, expect, test } from 'vitest';
import { Graph } from '../../src/graph/index.js';
import type { UniqueNode } from '../../src/types.js';

export function createNode(key = 'some-name'): UniqueNode {
  return {
    key,
  };
}

describe('graph', () => {
  test('should addNode', async () => {
    const graph = new Graph<UniqueNode>();
    graph.addNode(createNode());
    expect(graph.nodes.size).toEqual(1);
  });

  test('should addEdge to node', async () => {
    const graph = new Graph<UniqueNode>();
    const someNode = graph.addNode(createNode('some-node'));
    const someEdgeNode = graph.addNode(createNode('some-edge-node'));

    graph.addEdge(someNode, someEdgeNode);
    expect(graph.nodes.has(someNode)).toBeTruthy();

    const maybeNode = graph.nodes.values().next().value;
    expect(maybeNode).toBe(someNode);
    expect(maybeNode.adjacent.values().next().value).toBe(someEdgeNode);
  });

  test('should produce a topologicalSort iterator', async () => {
    // Reference https://www.geeksforgeeks.org/topological-sorting/
    const graph = new Graph<UniqueNode>();

    const f = graph.addNode(createNode('5'));
    const a = graph.addNode(createNode('0'));
    const b = graph.addNode(createNode('1'));
    const c = graph.addNode(createNode('2'));
    const d = graph.addNode(createNode('3'));
    const e = graph.addNode(createNode('4'));

    graph.addEdge(f, c); // 5,2
    graph.addEdge(f, a); // 5,0
    graph.addEdge(e, a); // 4,0
    graph.addEdge(e, b); // 4,1
    graph.addEdge(c, d); // 2,3
    graph.addEdge(d, b); // 3,1

    // We expect a leaf-to-root output.
    // const expected = ['0', '1', '3', '2', '4', '5'];
    // This order is determiend by the order for which the node was added to the graph.
    // Node f was added first and it's dependencies are in the order of adjacencies.
    const expected = ['1', '3', '2', '0', '5', '4'];
    const nodes = graph.topSort();
    const actual = nodes.map((node) => node.content.key);
    expect(actual).toEqual(expected);
  });

  test('should print a graph relative to a passed node', async () => {
    // Reference https://www.geeksforgeeks.org/topological-sorting/
    const graph = new Graph<UniqueNode>();

    const f = graph.addNode(createNode('5'));
    const a = graph.addNode(createNode('0'));
    const b = graph.addNode(createNode('1'));
    const c = graph.addNode(createNode('2'));
    const d = graph.addNode(createNode('3'));
    const e = graph.addNode(createNode('4'));

    graph.addEdge(f, c); // 5,2
    graph.addEdge(f, a); // 5,0
    graph.addEdge(e, a); // 4,0
    graph.addEdge(e, b); // 4,1
    graph.addEdge(c, d); // 2,3
    graph.addEdge(d, b); // 3,1

    // We expect a leaf-to-root output.
    const expected = ['1', '3', '2', '0', '5', '4'];
    const nodes = graph.topSort(c);
    const actual = nodes.map((node) => node.content.key);
    expect(actual).toEqual(expected);
  });
});
