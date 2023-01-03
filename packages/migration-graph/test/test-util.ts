import { type PackageNode, Package } from '@rehearsal/migration-graph-shared';

export function createNodeContent(name = 'some-name'): PackageNode {
  const pkg = new Package('./', { name });

  return {
    key: './',
    pkg,
    converted: false,
  };
}
