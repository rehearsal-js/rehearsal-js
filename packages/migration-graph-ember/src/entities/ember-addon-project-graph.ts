import { EmberAppProjectGraph, EmberAppProjectGraphOptions } from './ember-app-project-graph';

export type EmberAddonProjectGraphOptions = EmberAppProjectGraphOptions;

export class EmberAddonProjectGraph extends EmberAppProjectGraph {
  constructor(rootDir: string, options?: EmberAddonProjectGraphOptions) {
    options = { sourceType: 'Ember Addon', ...options };
    super(rootDir, options);
  }
}
