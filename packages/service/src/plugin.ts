import { Reporter } from '@rehearsal/reporter';
import { Logger } from 'winston';
import { RehearsalService } from './rehearsal-service';

export interface Plugin<PluginOptions> {
  run(fileName: string, context: PluginsRunnerContext, options: PluginOptions): PluginResult;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginOptions {}

export type PluginResult = Promise<string[]>;

export interface PluginsRunnerContext {
  basePath: string;
  rehearsal: RehearsalService;
  reporter: Reporter;
  logger?: Logger;
}

// TODO: Remove this class with @rehearsal/logger
export interface PluginLogger {
  log(message: string): void;
}

export class PluginsRunner {
  plugins: { plugin: Plugin<PluginOptions>; options: PluginOptions }[] = [];
  context: PluginsRunnerContext;

  constructor(context: PluginsRunnerContext) {
    this.context = context;
  }

  queue<P extends Plugin<PluginOptions>>(
    plugin: P,
    options: P extends Plugin<infer O> ? O : never
  ): this {
    this.plugins.push({ plugin, options });
    return this;
  }

  async run(fileNames: string[], logger?: PluginLogger): Promise<void> {
    const fileIteratorProcessor = this.processFilesGenerator(fileNames, logger);

    for await (const _ of fileIteratorProcessor) {
      const next = async (): Promise<void> => {
        const { done } = await fileIteratorProcessor.next();
        if (!done) {
          setImmediate(next);
        }
      };

      await next();
    }
  }

  // Async generator to process files
  // Since this is a long-running process, we need to yield to the event loop
  // So we don't block the main thread
  async *processFilesGenerator(fileNames: string[], logger?: PluginLogger): AsyncGenerator<void> {
    for (const fileName of fileNames) {
      logger?.log(`processing file: ${fileName.replace(this.context.basePath, '')}`);

      const allChangedFiles: Set<string> = new Set();
      const pluginIteratorProcessor = this.processPlugins(fileName, allChangedFiles);

      for await (const changedFile of pluginIteratorProcessor) {
        const next = async (): Promise<void> => {
          const { done } = await pluginIteratorProcessor.next();
          // Save file to the filesystem
          changedFile.forEach((file) => this.context.rehearsal.saveFile(file));

          if (!done) {
            setImmediate(next);
          }
        };

        await next();
      }

      yield;
    }
  }

  async *processPlugins(
    fileName: string,
    allChangedFiles: Set<string>
  ): AsyncGenerator<Set<string>> {
    for (const plugin of this.plugins) {
      const changedFiles = await plugin.plugin.run(fileName, this.context, plugin.options);

      allChangedFiles = new Set([...allChangedFiles, ...changedFiles]);

      yield allChangedFiles;
    }
  }
}
