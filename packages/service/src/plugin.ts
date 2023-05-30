import { Reporter } from '@rehearsal/reporter';
import { Logger } from 'winston';
import { Service } from './rehearsal-service.js';

export abstract class Plugin<Options extends PluginOptions = PluginOptions> {
  fileName: string;
  context: PluginsRunnerContext;
  options: Options;
  constructor(fileName: string, context: PluginsRunnerContext, options: Options) {
    this.fileName = fileName;
    this.context = context;
    this.options = options;
  }
  abstract run(): Promise<string[]>;
}

export class DummyPlugin extends Plugin {
  run(): Promise<string[]> {
    return Promise.resolve([]);
  }
}

export type PluginFactory<
  PluginType extends Plugin = Plugin,
  PluginOptionsType extends PluginOptions = PluginOptions
> = new (fileName: string, context: PluginsRunnerContext, options: PluginOptionsType) => PluginType;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginOptions {}

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
  layers: {
    plugin: PluginFactory;
    options?: PluginOptions;
    filter?: (fileName: string) => boolean;
  }[] = [];
  context: PluginsRunnerContext;

  constructor(context: PluginsRunnerContext) {
    this.context = context;
  }

  /**
   * This accounts for all the call signatures. The final call signature needs
   * to account for all permutations.
   *
   * ```
   * .queue(SomePlugin)
   * .queue(SomePlugin, { someOption: true })
   * .queue(SomePlugin, function someFiler() { return true; })
   * .queue(SomePlugin, { someOption: true }, function someFiler() { return true; })
   *```
   */
  queue<
    PluginType extends Plugin = Plugin,
    PluginOptionsType extends PluginOptions = PluginOptions
  >(plugin: PluginFactory<PluginType, PluginOptionsType>): this;
  queue<
    PluginType extends Plugin = Plugin,
    PluginOptionsType extends PluginOptions = PluginOptions
  >(
    plugin: PluginFactory<PluginType, PluginOptionsType>,
    filter: (fileName: string) => boolean
  ): this;
  queue<
    PluginType extends Plugin = Plugin,
    PluginOptionsType extends PluginOptions = PluginOptions
  >(plugin: PluginFactory<PluginType, PluginOptionsType>, options: PluginOptionsType): this;
  queue<
    PluginType extends Plugin = Plugin,
    PluginOptionsType extends PluginOptions = PluginOptions
  >(
    plugin: PluginFactory<PluginType, PluginOptionsType>,
    options: PluginOptionsType,
    filter: (fileName: string) => boolean
  ): this;
  queue<
    PluginType extends Plugin = Plugin,
    PluginOptionsType extends PluginOptions = PluginOptions
  >(
    plugin: PluginFactory<PluginType>,
    ...optionsOrFilter:
      | []
      | [PluginOptionsType]
      | [(fileName: string) => boolean]
      | [PluginOptionsType, (fileName: string) => boolean]
  ): this {
    if (optionsOrFilter.length === 2) {
      const [options, filter] = optionsOrFilter;
      this.layers.push({ plugin: plugin, options, filter });
    } else if (optionsOrFilter.length === 1) {
      if (typeof optionsOrFilter[0] === 'object') {
        this.layers.push({
          plugin: plugin,
          options: optionsOrFilter[0],
        });
      } else {
        this.layers.push({
          plugin: plugin,
          filter: optionsOrFilter[0],
        });
      }
    } else {
      this.layers.push({ plugin });
    }
    return this;
  }

  // generator to yield at every file in processFilesGenerator
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
    for (const layer of this.layers) {
      if (layer.filter) {
        if (!layer.filter(fileName)) {
          yield allChangedFiles;
          continue;
        }
      }

      const plugin = new layer.plugin(fileName, this.context, layer.options ? layer.options : {});
      const changedFiles = await plugin.run();

      allChangedFiles = new Set([...allChangedFiles, ...changedFiles]);

      yield allChangedFiles;
    }
  }
}
