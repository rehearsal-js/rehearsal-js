import winston from 'winston';
import Reporter from '@rehearsal/reporter';
import RehearsalService from '../rehearsal-service';

export type PluginOptions = Record<string, unknown> | undefined;

export type PluginParams<PluginOptions> = {
  fileName: string;
  options?: PluginOptions;
};

export type PluginResult = Promise<string[]>;

export default class Plugin {
  protected readonly logger?: winston.Logger;
  protected readonly reporter?: Reporter;
  protected readonly service: RehearsalService;

  constructor(service: RehearsalService, logger?: winston.Logger, reporter?: Reporter) {
    this.service = service;
    this.logger = logger;
    this.reporter = reporter;
  }

  async run(params: PluginParams<PluginOptions>): PluginResult {
    return [params.fileName];
  }
}
