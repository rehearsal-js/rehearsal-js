import Component from '@glimmer/component';
import { inject as service } from '@ember/service';

export default class SomeComponent extends Component {
  @service('authentication@authenticated-user') authenticatedUser;

  @service('foo@foo-service') otherProp;
}
