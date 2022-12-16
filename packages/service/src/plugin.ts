import type { Reporter } from '@rehearsal/reporter';
import type { Logger } from 'winston';

import type { RehearsalService } from './rehearsal-service';

export class Plugin {
  protected readonly logger?: Logger;
  protected readonly reporter: Reporter;
  protected readonly service: RehearsalService;

  constructor(service: RehearsalService, reporter: Reporter, logger?: Logger) {
    this.service = service;
    this.logger = logger;
    this.reporter = reporter;
  }

  async run(fileName: string): PluginResult {
    return [fileName];
  }
}

export type PluginResult = Promise<string[]>;
