import { PackageNode } from '../src/types';

export function createNodeContent(name: string = 'some-name'): PackageNode {
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
