import fixturify from 'fixturify';
import tmp from 'tmp';
import { beforeEach, describe, expect, test } from 'vitest';

import { discoverServiceDependencies } from '../../utils/discover-ember-service-dependencies';

tmp.setGracefulCleanup();

describe('discoverServiceDependencies', () => {
  let tmpDir: string;

  beforeEach(() => {
    const { name: someDir } = tmp.dirSync();
    tmpDir = someDir;
  });

  test('noop', () => {
    const files = {
      'component.js': `
        import Component from '@glimmer/component';
        export default class Salutation extends Component {}
      `,
    };

    fixturify.writeSync(tmpDir, files);

    const results = discoverServiceDependencies(tmpDir, 'component.js');

    expect(results).toBeFalsy;
  });

  test('should return empty array when no services decorators are used', () => {
    const files = {
      'component.js': `
        import Component from '@glimmer/component';
        import { inject as service } from '@ember/service';

        export function foo() {
          return "hello";
        }
      `,
    };

    fixturify.writeSync(tmpDir, files);
    const result = discoverServiceDependencies(tmpDir, 'component.js');
    expect(result).toEqual([]);
  });

  test('should find service', () => {
    const files = {
      'component.js': `
        import Component from '@glimmer/component';
        import { inject } from '@ember/service';

        export default class Salutation extends Component {
          @inject locale;
        }
      `,
    };

    fixturify.writeSync(tmpDir, files);

    const results = discoverServiceDependencies(tmpDir, 'component.js');

    expect(results).toBeTruthy();
    expect(results?.length).toBe(1);
    const discovered = results[0];
    expect(discovered.serviceName).toBe('locale');
  });

  test('should find service when decorator method is renamed', () => {
    const files = {
      'component.js': `
        import Component from '@glimmer/component';
        import { inject as service } from '@ember/service';

        export default class Salutation extends Component {
          @service locale;
        }
      `,
    };

    fixturify.writeSync(tmpDir, files);

    const results = discoverServiceDependencies(tmpDir, 'component.js');

    expect(results).toBeTruthy();
    expect(results?.length).toBe(1);
    const discovered = results[0];
    expect(discovered.serviceName).toBe('locale');
  });

  test('should find multiple services', () => {
    const files = {
      'component.js': `
        import Component from '@glimmer/component';
        import { inject as service } from '@ember/service';

        export default class Salutation extends Component {
          @service locale;
          @service tracking;
          @service request;
        }
      `,
    };

    fixturify.writeSync(tmpDir, files);

    const results = discoverServiceDependencies(tmpDir, 'component.js');

    expect(results).toBeTruthy();
    expect(results.length).toBe(3);
    expect(results[0].serviceName).toBe('locale');
    expect(results[1].serviceName).toBe('tracking');
    expect(results[2].serviceName).toBe('request');
  });

  test('should discover serviceName if renamed', () => {
    const files = {
      'component.js': `
        import Component from '@glimmer/component';
        import { inject as service } from '@ember/service';

        export default class Salutation extends Component {
          @service('shopping-cart') cart;
        }
      `,
    };

    fixturify.writeSync(tmpDir, files);

    const results = discoverServiceDependencies(tmpDir, 'component.js');

    expect(results).toBeTruthy();
    expect(results.length).toBe(1);
    expect(results[0].serviceName).toBe('shopping-cart');
  });
  test('should find fully qualified serviceName from addon', () => {
    const { name: tmpDir } = tmp.dirSync();

    const files = {
      'component.js': `
        import Component from '@glimmer/component';
        import { inject as service } from '@ember/service';

        export default class Salutation extends Component {
          @service('authentication@authenticated-user') authenticatedUser;
        }
      `,
    };

    fixturify.writeSync(tmpDir, files);

    const results = discoverServiceDependencies(tmpDir, 'component.js');

    expect(results).toBeTruthy();
    expect(results.length).toBe(1);
    expect(results[0].addonName).toBe('authentication');
    expect(results[0].serviceName).toBe('authenticated-user');
  });
  test('should find without class on export', () => {
    const files = {
      'component.js': `
        import Component from '@glimmer/component';
        import { inject as service } from '@ember/service';

        class Salutation extends Component {
          @service locale;
        }

        export default Salutation;
      `,
    };

    fixturify.writeSync(tmpDir, files);

    const resultss = discoverServiceDependencies(tmpDir, 'component.js');

    expect(resultss).toBeTruthy();
    expect(resultss.length).toBe(1);
    expect(resultss[0].serviceName).toBe('locale');
  });

  test('should handle multiple imports of @ember/service', () => {
    const files = {
      'service.js': `
        import Service from '@ember/service';
        import { inject as service } from '@ember/service';

        export default class Locale extends Service {
          @service request;
        }
      `,
    };

    fixturify.writeSync(tmpDir, files);

    const resultss = discoverServiceDependencies(tmpDir, 'service.js');

    expect(resultss).toBeTruthy();
    expect(resultss.length).toBe(1);
    expect(resultss[0].serviceName).toBe('request');
  });

  test('should handle default export and named exports from @ember/service', () => {
    const { name: tmpDir } = tmp.dirSync();

    const files = {
      'service.js': `
        import Service, { inject as service } from '@ember/service';

        export default class Locale extends Service {
          @service request;
        }
      `,
    };

    fixturify.writeSync(tmpDir, files);

    const resultss = discoverServiceDependencies(tmpDir, 'service.js');

    expect(resultss).toBeTruthy();
    expect(resultss.length).toBe(1);
    expect(resultss[0].serviceName).toBe('request');
  });

  test('should ignore @classic decorator', () => {
    const files = {
      'component.js': `
        import classic from 'ember-classic-decorator';
        import Component from '@glimmer/component';
        import { inject } from '@ember/service';

        @classic
        export default class Salutation extends Component {
          @inject locale;
        }
      `,
    };

    fixturify.writeSync(tmpDir, files);

    const results = discoverServiceDependencies(tmpDir, 'component.js');

    expect(results).toBeTruthy();
    expect(results?.length).toBe(1);
    const discovered = results[0];
    expect(discovered.serviceName).toBe('locale');
  });
});
