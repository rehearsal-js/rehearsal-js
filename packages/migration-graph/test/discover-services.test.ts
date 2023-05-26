import { describe, expect, test } from 'vitest';

import { discoverServiceDependencies } from '../src/discover-services.js';

describe('discoverServiceDependencies', () => {
  test('noop', () => {
    const content = `
      import Component from '@glimmer/component';
      export default class Salutation extends Component {}
    `;

    const results = discoverServiceDependencies({})('ecmascript', content);

    expect(results).toStrictEqual([]);
  });

  test('should return empty array if a file cannot be parsed', () => {
    const content = `
      import Component form '@glimmer/component';
      export default klass Salutation extends Component {}
    `;

    const results = discoverServiceDependencies({})('ecmascript', content);

    expect(results).toStrictEqual([]);
  });

  test('should return empty array when no services decorators are used', () => {
    const content = `
      import Component from '@glimmer/component';
      import { service } from '@ember/service';

      export function foo() {
        return "hello";
      }
    `;
    const results = discoverServiceDependencies({})('ecmascript', content);
    expect(results).toEqual([]);
  });

  test('should return empty array when @glimmerx/service is used', () => {
    const content = `
      import Component from '@glimmer/component';
      import { service } from '@glmmerx/service';

      export function foo() {
        return "hello";
      }
    `;
    const results = discoverServiceDependencies({})('ecmascript', content);
    expect(results).toEqual([]);
  });

  test('should find service', () => {
    const content = `
      import Component from '@glimmer/component';
      import { service } from '@ember/service';

      export default class Salutation extends Component {
        @service locale;
      }
    `;

    const results = discoverServiceDependencies({})('ecmascript', content);

    expect(results).toBeTruthy();
    expect(results?.length).toBe(1);
    expect(results[0]).toBe('locale');
  });

  test('should find service when decorator method is renamed', () => {
    const content = `
      import Component from '@glimmer/component';
      import { service as something } from '@ember/service';

      export default class Salutation extends Component {
        @something locale;
      }
    `;

    const results = discoverServiceDependencies({})('ecmascript', content);

    expect(results).toBeTruthy();
    expect(results?.length).toBe(1);
    expect(results[0]).toBe('locale');
  });

  test('should find multiple services', () => {
    const content = `
      import Component from '@glimmer/component';
      import { inject as service } from '@ember/service';

      export default class Salutation extends Component {
        @service locale;
        @service tracking;
        @service request;
      }
    `;

    const results = discoverServiceDependencies({})('ecmascript', content);

    expect(results).toBeTruthy();
    expect(results.length).toBe(3);
    expect(results[0]).toBe('locale');
    expect(results[1]).toBe('tracking');
    expect(results[2]).toBe('request');
  });

  test('should discover serviceName if renamed', () => {
    const content = `
      import Component from '@glimmer/component';
      import { inject as service } from '@ember/service';

      export default class Salutation extends Component {
        @service('shopping-cart') cart;
      }
    `;

    const results = discoverServiceDependencies({})('ecmascript', content);

    expect(results).toBeTruthy();
    expect(results.length).toBe(1);
    expect(results[0]).toBe('shopping-cart');
  });

  test('should find fully qualified serviceName from addon', () => {
    const content = `
      import Component from '@glimmer/component';
      import { inject as service } from '@ember/service';

      export default class Salutation extends Component {
        @service('authentication@authenticated-user') authenticatedUser;
      }
    `;

    const results = discoverServiceDependencies({})('ecmascript', content);

    expect(results).toBeTruthy();
    expect(results.length).toBe(1);
    expect(results[0]).toBe('authentication/services/authenticated-user');
  });

  test.todo('should find fully qualified serviceName package with org', () => {
    const content = `
      import Component from '@glimmer/component';
      import { inject as service } from '@ember/service';

      export default class Salutation extends Component {
        @service('@some-org/authentication@authenticated-user') authenticatedUser;
      }
    `;

    const results = discoverServiceDependencies({})('ecmascript', content);

    expect(results).toBeTruthy();
    expect(results.length).toBe(1);
    expect(results[0]).toBe('@some-org/authentication/services/authenticated-user');
  });

  test('should find without class on export', () => {
    const content = `
      import Component from '@glimmer/component';
      import { service } from '@ember/service';

      class Salutation extends Component {
        @service locale;
      }

      export default Salutation;
    `;

    const results = discoverServiceDependencies({})('ecmascript', content);

    expect(results).toBeTruthy();
    expect(results.length).toBe(1);
    expect(results[0]).toBe('locale');
  });

  test('should handle multiple imports of @ember/service', () => {
    const content = `
        import Service from '@ember/service';
        import { service } from '@ember/service';

        export default class Locale extends Service {
          @service request;
        }
      `;

    const results = discoverServiceDependencies({})('ecmascript', content);

    expect(results).toBeTruthy();
    expect(results.length).toBe(1);
    expect(results[0]).toBe('request');
  });

  test('should handle default export and named exports from @ember/service', () => {
    const content = `
        import Service, { service } from '@ember/service';

        export default class Locale extends Service {
          @service request;
        }
      `;

    const results = discoverServiceDependencies({})('ecmascript', content);

    expect(results).toBeTruthy();
    expect(results.length).toBe(1);
    expect(results[0]).toBe('request');
  });

  test('should ignore @classic decorator', () => {
    const content = `
        import classic from 'ember-classic-decorator';
        import Component from '@glimmer/component';
        import { inject } from '@ember/service';

        @classic
        export default class Salutation extends Component {
          @inject locale;
        }
      `;

    const results = discoverServiceDependencies({})('ecmascript', content);

    expect(results).toBeTruthy();
    expect(results?.length).toBe(1);
    expect(results[0]).toBe('locale');
  });

  describe('ember@3.28', () => {
    test('should find service usage with inject export', () => {
      const content = `
      import Component from '@glimmer/component';
      import { inject as service } from '@ember/service';

      export default class Salutation extends Component {
        @service locale;
      }
    `;

      const results = discoverServiceDependencies({})('ecmascript', content);

      expect(results).toBeTruthy();
      expect(results?.length).toBe(1);
      expect(results[0]).toBe('locale');
    });

    test('should find service when decorator method is renamed', () => {
      const content = `
      import Component from '@glimmer/component';
      import { inject as something } from '@ember/service';

      export default class Salutation extends Component {
        @something locale;
      }
    `;

      const results = discoverServiceDependencies({})('ecmascript', content);

      expect(results).toBeTruthy();
      expect(results?.length).toBe(1);
      expect(results[0]).toBe('locale');
    });
  });
});
