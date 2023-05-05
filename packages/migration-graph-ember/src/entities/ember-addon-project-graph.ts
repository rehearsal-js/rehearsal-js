import debug, { type Debugger } from 'debug';
import { ProjectGraphOptions } from '@rehearsal/migration-graph-shared';
import { EmberAppProjectGraph } from './ember-app-project-graph.js';

export class EmberAddonProjectGraph extends EmberAppProjectGraph {
  override debug: Debugger = debug(`rehearsal:migration-graph-ember:${this.constructor.name}`);
  constructor(rootDir: string, options: ProjectGraphOptions) {
    super(rootDir, { ...options });
    this.debug(`rootDir: %s, options: %o`, rootDir, options);
  }
}
