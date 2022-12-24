import type { Graph } from '../graph';
import type { ModuleNode } from '../types';

export interface IPackage {
  getModuleGraph(options: unknown): Graph<ModuleNode>;
}
