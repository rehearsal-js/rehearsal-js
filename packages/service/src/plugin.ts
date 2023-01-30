import type { Reporter } from '@rehearsal/reporter';
import type { Logger } from 'winston';

import type { RehearsalService } from './rehearsal-service';

export interface Plugin<PluginOptions> {
  run(fileName: string, options: PluginOptions): PluginResult;
}

export interface PluginOptions {
  [key: string]: unknown;

  service: RehearsalService;
  reporter: Reporter;
  logger?: Logger;
}

export type PluginResult = Promise<string[]>;
