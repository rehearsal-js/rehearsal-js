import type { PackageNode } from '../src/types';

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
