import { Package } from '../entities/package';
import type { PackageNode } from '../types';

export function createNodeContent(name = 'some-name'): PackageNode {
  return {
    key: './',
    pkg: new Package(`./${name}`),
    converted: false,
  };
}
