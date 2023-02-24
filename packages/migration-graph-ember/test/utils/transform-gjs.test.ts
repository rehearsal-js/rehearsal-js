import { describe, expect, test } from 'vitest';
import { transformGjs } from '../../src/utils/transform-gjs';

describe('transformGjs', () => {
  test('should support .gjs file extension', () => {
    const source = `
      import Component from '@glimmer/component';
      import { inject as service } from '@ember/service';

      const Greeting = <template>Hello</template>

      class Salutation extends Component {
        @service locale;


        get thing() {
          this.locale.getLocale();
        }

        <template>
          <Greeting/> from {{this.thing}}
        </template>
      }

      export default Salutation;
    `;

    const output = transformGjs('component.gjs', source);
    expect(output).toMatchSnapshot();
  });
});
