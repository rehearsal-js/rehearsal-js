import debug, { type Debugger } from 'debug';
import { EmberAppProjectGraph, EmberAppProjectGraphOptions } from './ember-app-project-graph';

export type EmberAddonProjectGraphOptions = EmberAppProjectGraphOptions;

export class EmberAddonProjectGraph extends EmberAppProjectGraph {
  protected debug: Debugger = debug(`rehearsal:migration-graph-ember:${this.constructor.name}`);
  constructor(rootDir: string, options?: EmberAddonProjectGraphOptions) {
    super(rootDir, { sourceType: 'Ember Addon', ...options });
    this.debug(`rootDir: %s, options: %o`, rootDir, options);
  }
}
