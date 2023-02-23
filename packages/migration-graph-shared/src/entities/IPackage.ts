import type { Graph } from '../graph/index.js';
import type { ModuleNode } from '../types.js';

export interface IPackage {
  getModuleGraph(): Graph<ModuleNode>;
}
