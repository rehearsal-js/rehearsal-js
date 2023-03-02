import { Package } from '../src/index.js';
import type { PackageNode } from '../src/types.js';

export function createNodeContent(name = 'some-name'): PackageNode {
  const pkg = new Package('./', { name });

  return {
    key: './',
    pkg,
    converted: false,
  };
}
