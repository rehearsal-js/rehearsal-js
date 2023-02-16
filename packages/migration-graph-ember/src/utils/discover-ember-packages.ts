import { EmberAppProjectGraph } from '../entities/ember-app-project-graph';
import type { EmberProjectPackage } from '../types';

export function discoverEmberPackages(rootDir: string): Array<EmberProjectPackage> {
  const projectGraph = new EmberAppProjectGraph(rootDir);
  projectGraph.discover();
  const nodes = projectGraph.graph.topSort();
  return Array.from(nodes).map((node) => node.content.pkg);
}
