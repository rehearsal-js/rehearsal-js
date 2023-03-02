// This is consumed by CLI. We can rename the import and drop this.
export { discoverEmberPackages } from '@rehearsal/migration-graph-ember';

export {
  getMigrationStrategy,
  type MigrationStrategy,
  type MigrationStrategyOptions,
  type SourceFile,
} from './migration-strategy.js';
