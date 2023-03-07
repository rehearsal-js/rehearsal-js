import { Reporter } from '@rehearsal/reporter';
import { describe, expect, test, vi, afterEach } from 'vitest';
import { Plugin, PluginOptions, PluginsRunner } from '../src/plugin.js';
import { RehearsalService } from '../src/rehearsal-service.js';

describe('PluginsRunner', () => {
  describe('filter', () => {
    const reporter = new Reporter({
      tsVersion: '',
      projectName: '@rehearsal/test',
      basePath: '.',
      commandName: '@rehearsal/migrate',
    });

    const service = new RehearsalService({}, []);

    const plugin1Spy = vi.fn(() => []);

    class Plugin1 implements Plugin<PluginOptions> {
      async run(): Promise<string[]> {
        return plugin1Spy();
      }
    }

    const plugin2Spy = vi.fn(() => []);

    class Plugin2 implements Plugin<PluginOptions> {
      async run(): Promise<string[]> {
        return plugin2Spy();
      }
    }

    afterEach(() => {
      vi.clearAllMocks();
    });

    test('run after ignored', async () => {
      const runner = new PluginsRunner({ reporter, service, basePath: '.' });

      runner.queue(new Plugin1(), { filter: () => false });
      runner.queue(new Plugin2(), { filter: () => true });

      await runner.run(['foo.js']);

      expect(plugin1Spy).not.toHaveBeenCalled();
      expect(plugin2Spy).toHaveBeenCalled();
    });

    test('ignored after run', async () => {
      const runner = new PluginsRunner({ reporter, service, basePath: '.' });

      runner.queue(new Plugin1(), { filter: () => true });
      runner.queue(new Plugin2(), { filter: () => false });

      await runner.run(['foo.js']);

      expect(plugin1Spy).toHaveBeenCalled();
      expect(plugin2Spy).not.toHaveBeenCalled();
    });

    test('run by default', async () => {
      const runner = new PluginsRunner({ reporter, service, basePath: '.' });

      runner.queue(new Plugin1(), {});
      runner.queue(new Plugin2(), { filter: () => false });

      await runner.run(['foo.js']);

      expect(plugin1Spy).toHaveBeenCalled();
      expect(plugin2Spy).not.toHaveBeenCalled();
    });

    test('resume after ignored', async () => {
      const runner = new PluginsRunner({ reporter, service, basePath: '.' });

      const plugin3Spy = vi.fn(() => []);

      class Plugin3 implements Plugin<PluginOptions> {
        async run(): Promise<string[]> {
          return plugin3Spy();
        }
      }

      runner.queue(new Plugin1(), { filter: () => true });
      runner.queue(new Plugin2(), { filter: () => false });
      runner.queue(new Plugin3(), { filter: () => true });

      await runner.run(['foo.js']);

      expect(plugin1Spy).toHaveBeenCalled();
      expect(plugin2Spy).not.toHaveBeenCalled();
      expect(plugin3Spy).toHaveBeenCalled();
    });
  });
});
