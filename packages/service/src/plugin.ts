import { Reporter } from '@rehearsal/reporter';
import { Logger } from 'winston';
import { Service } from './rehearsal-service.js';

export interface Plugin<PluginOptions> {
  run(fileName: string, context: PluginsRunnerContext, options: PluginOptions): PluginResult;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginOptions {
  filter?: (fileName: string) => boolean;
}

export type PluginResult = Promise<string[]>;

export interface PluginsRunnerContext {
  basePath: string;
  service: Service;
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

  async runAll(fileNames: string[], logger?: PluginLogger): Promise<void> {
    const fileIteratorProcessor = this.processFilesGenerator(fileNames, logger);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of fileIteratorProcessor) {
      const next = async (): Promise<void> => {
        const { done } = await fileIteratorProcessor.next();
        if (!done) {
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          setImmediate(next);
        }
      };

      await next();
    }
  }

  // Generator version of runAll
  // Wait for each step in processFilesGenerator completed to continue
  // This is used in @rehearsal/cli interactive mode when we need to wait/pause for every file
  async *run(fileNames: string[], logger?: PluginLogger): AsyncGenerator<string> {
    const fileIteratorProcessor = this.processFilesGenerator(fileNames, logger);
    for await (const fileName of fileIteratorProcessor) {
      yield fileName;
    }
  }

  // Async generator to process files
  // Since this is a long-running process, we need to yield to the event loop
  // So we don't block the main thread
  async *processFilesGenerator(fileNames: string[], logger?: PluginLogger): AsyncGenerator<string> {
    for (const fileName of fileNames) {
      logger?.log(`processing file: ${fileName.replace(this.context.basePath, '')}`);

      const allChangedFiles: Set<string> = new Set();
      const pluginIteratorProcessor = this.processPlugins(fileName, allChangedFiles);

      for await (const changedFile of pluginIteratorProcessor) {
        const next = async (): Promise<void> => {
          const { done } = await pluginIteratorProcessor.next();
          // Save file to the filesystem
          changedFile.forEach((file) => this.context.service.saveFile(file));

          if (!done) {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            setImmediate(next);
          }
        };

        await next();
      }

      yield fileName;
    }
  }

  async *processPlugins(
    fileName: string,
    allChangedFiles: Set<string>
  ): AsyncGenerator<Set<string>> {
    for (const plugin of this.plugins) {
      if (plugin.options.filter) {
        if (!plugin.options.filter(fileName)) {
          yield allChangedFiles;
          continue;
        }
      }

      const changedFiles = await plugin.plugin.run(fileName, this.context, plugin.options);

      allChangedFiles = new Set([...allChangedFiles, ...changedFiles]);

      yield allChangedFiles;
    }
  }
}
