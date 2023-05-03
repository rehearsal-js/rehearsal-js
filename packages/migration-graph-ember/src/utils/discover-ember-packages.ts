import { onlyPackage } from '@rehearsal/migration-graph-shared';
import { EmberAppProjectGraph } from '../entities/ember-app-project-graph.js';
import type { EmberProjectPackage } from '../types.js';

export function discoverEmberPackages(rootDir: string): Array<EmberProjectPackage> {
  const projectGraph = new EmberAppProjectGraph(rootDir, { basePath: rootDir });
  projectGraph.discover();
  const nodes = projectGraph.graph.getSortedNodes();
  return (
    Array.from(nodes)
      .map((node) => node.content.pkg)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .filter(onlyPackage)
  );
}
