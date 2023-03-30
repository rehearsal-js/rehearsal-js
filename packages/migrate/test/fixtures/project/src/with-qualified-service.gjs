import Component from '@glimmer/component';
import { inject as service } from '@ember/service';

export default class Hello extends Component {
  @service('authentication@authenticated-user') authenticatedUser;

  name = 'world';

  <template>
    <span>Hello, I am {{this.name}} and I am {{@age}} years old!</span>
  </template>
}
