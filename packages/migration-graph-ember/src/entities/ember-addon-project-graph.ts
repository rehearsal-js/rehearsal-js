import debug from 'debug';
import { EmberAppProjectGraph } from './ember-app-project-graph';
const DEBUG_CALLBACK = debug('rehearsal:migration-graph-ember:ember-addon-project-graph');

export class EmberAddonProjectGraph extends EmberAppProjectGraph {
  constructor(rootDir: string, sourceType: string) {
    super(rootDir, sourceType);
    DEBUG_CALLBACK('constructor');
  }
}
