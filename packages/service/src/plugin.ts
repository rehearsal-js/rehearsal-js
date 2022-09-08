import type { Reporter } from '@rehearsal/reporter';
import type { Logger } from 'winston';

import type { RehearsalService } from './rehearsal-service';

export class Plugin {
  protected readonly logger?: Logger;
  protected readonly reporter?: Reporter;
  protected readonly service: RehearsalService;

  constructor(service: RehearsalService, logger?: Logger, reporter?: Reporter) {
    this.service = service;
    this.logger = logger;
    this.reporter = reporter;
  }

  async run(params: PluginParams<PluginOptions>): PluginResult {
    return [params.fileName];
  }
}

export type PluginOptions = Record<string, unknown> | undefined;

export type PluginParams<PluginOptions> = {
  fileName: string;
  options?: PluginOptions;
};

export type PluginResult = Promise<string[]>;
