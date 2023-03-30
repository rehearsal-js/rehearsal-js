import Component from '@glimmer/component';
import { inject as service } from '@ember/service';

export default class Hello extends Component {
  @service('authenticated-user') authenticatedUser;

  name = 'world';

  <template>
    <span>Hello, I am {{this.authenticatedUser}}</span>
  </template>
}
