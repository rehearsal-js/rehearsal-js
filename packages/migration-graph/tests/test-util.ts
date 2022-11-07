import type { PackageNode } from '@rehearsal/migration-graph-shared';

export function createNodeContent(name = 'some-name'): PackageNode {
  return {
    key: './',
    pkg: {
      path: './',
      name,
      dependencies: {},
      devDependencies: {},
    },
    converted: false,
  };
}
