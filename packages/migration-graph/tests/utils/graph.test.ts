import { UniqueGraphNode } from 'src/types';
import { describe, test, expect } from 'vitest';
import Graph from '../../src/utils/graph';

export function createNode(key: string = 'some-name'): UniqueGraphNode {
  return {
    key,
  };
}

describe('graph', () => {
  test('should addNode', async () => {
    const graph = new Graph<UniqueGraphNode>();
    graph.addNode(createNode());
    expect(graph.nodes.size).toEqual(1);
  });

  test('should addEdge to node', async () => {
    const graph = new Graph<UniqueGraphNode>();
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
    let graph = new Graph<UniqueGraphNode>();

    const a = graph.addNode(createNode('0'));
    const b = graph.addNode(createNode('1'));
    const c = graph.addNode(createNode('2'));
    const d = graph.addNode(createNode('3'));
    const e = graph.addNode(createNode('4'));
    const f = graph.addNode(createNode('5'));

    graph.addEdge(f, c); // 5,2
    graph.addEdge(f, a); // 5,0
    graph.addEdge(e, a); // 4,0
    graph.addEdge(e, b); // 4,1
    graph.addEdge(c, d); // 2,3
    graph.addEdge(d, b); // 3,1

    // We expect a leaf-to-root output.
    const expected = ['0', '1', '3', '2', '4', '5'];
    const nodes = graph.topSort();
    const actual = nodes.map((node) => node.content.key);
    expect(actual).toEqual(expected);
  });
});
