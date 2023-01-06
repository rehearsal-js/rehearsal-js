import type { Graph } from '../graph';
import type { ModuleNode } from '../types';

export interface IPackage {
  getModuleGraph(): Graph<ModuleNode>;
}
