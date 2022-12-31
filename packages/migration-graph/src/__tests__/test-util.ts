import { Package, PackageNode } from '@rehearsal/migration-graph-shared';

export function createNodeContent(name = 'some-name'): PackageNode {
  return {
    key: './',
    pkg: new Package(`./${name}`),
    converted: false,
  };
}
