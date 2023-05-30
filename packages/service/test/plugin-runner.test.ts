import { Reporter } from '@rehearsal/reporter';
import { describe, expect, test, vi, afterEach, beforeEach, Mock } from 'vitest';
import { Plugin, PluginOptions, PluginsRunner } from '../src/plugin.js';
import { RehearsalService } from '../src/rehearsal-service.js';

describe('PluginsRunner', () => {
  describe('filter', () => {
    const reporter = new Reporter({
      tsVersion: '',
      projectName: '@rehearsal/test',
      projectRootDir: '.',
    });

    const service = new RehearsalService({}, []);

    let plugin1Spy: Mock<[], never[]>;
    let plugin2Spy: Mock<[], never[]>;
    let plugin3Spy: Mock<[], never[]>;

    beforeEach(() => {
      plugin1Spy = vi.fn(() => []);
      plugin2Spy = vi.fn(() => []);
      plugin3Spy = vi.fn(() => []);
    });

    class Plugin1 extends Plugin<PluginOptions> {
      async run(): Promise<string[]> {
        return Promise.resolve(plugin1Spy());
      }
    }

    class Plugin2 extends Plugin<PluginOptions> {
      async run(): Promise<string[]> {
        return Promise.resolve(plugin2Spy());
      }
    }

    afterEach(() => {
      vi.clearAllMocks();
    });

    test('run after ignored', async () => {
      const runner = new PluginsRunner({ reporter, service, basePath: '.' });

      runner.queue(Plugin1, () => false);
      runner.queue(Plugin2, () => true);

      for await (const _ of runner.run(['foo.js'])) {
        // no ops for yield
      }

      expect(plugin1Spy).not.toHaveBeenCalled();
      expect(plugin2Spy).toHaveBeenCalled();
    });

    test('ignored after run', async () => {
      const runner = new PluginsRunner({ reporter, service, basePath: '.' });

      runner.queue(Plugin1, () => true);
      runner.queue(Plugin2, () => false);

      for await (const _ of runner.run(['foo.js'])) {
        // no ops for yield
      }

      expect(plugin1Spy).toHaveBeenCalled();
      expect(plugin2Spy).not.toHaveBeenCalled();
    });

    test('run by default', async () => {
      const runner = new PluginsRunner({ reporter, service, basePath: '.' });

      runner.queue(Plugin1);
      runner.queue(Plugin2, () => false);

      for await (const _ of runner.run(['foo.js'])) {
        // no ops for yield
      }

      expect(plugin1Spy).toHaveBeenCalled();
      expect(plugin2Spy).not.toHaveBeenCalled();
    });

    test('resume after ignored', async () => {
      const runner = new PluginsRunner({ reporter, service, basePath: '.' });

      class Plugin3 extends Plugin<PluginOptions> {
        async run(): Promise<string[]> {
          return Promise.resolve(plugin3Spy());
        }
      }

      runner.queue(Plugin1, () => true);
      runner.queue(Plugin2, () => false);
      runner.queue(Plugin3, () => true);

      for await (const _ of runner.run(['foo.js'])) {
        // no ops for yield
      }

      expect(plugin1Spy).toHaveBeenCalled();
      expect(plugin2Spy).not.toHaveBeenCalled();
      expect(plugin3Spy).toHaveBeenCalled();
    });
  });
});
