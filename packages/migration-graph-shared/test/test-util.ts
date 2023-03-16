import { Package } from '../src/index.js';
import type { PackageNode } from '../src/types.js';

export function createNodeContent(name = 'some-name'): PackageNode {
  return {
    key: './',
    pkg: { packageName: name } as Package,
    converted: false,
  };
}
