import { Package } from '../src';
import type { PackageNode } from '../src/types';

export function createNodeContent(name = 'some-name'): PackageNode {
  const pkg = new Package('./', { name });

  return {
    key: './',
    pkg,
    converted: false,
  };
}
