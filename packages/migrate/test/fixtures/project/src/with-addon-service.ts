import Component from '@glimmer/component';
import { inject as service } from '@ember/service';

export default class SomeComponent extends Component {
  @service('my-addon@foo') foo;
}
