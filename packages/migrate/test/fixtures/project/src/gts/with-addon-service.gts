import Component from '@glimmer/component';
import { inject as service } from '@ember/service';

export default class SomeGtsComponent extends Component {
  @service('my-addon@foo') foo;

  @service("@my-org/some-ember-addon@LocaleService") locale;

  <template>Hello</template>
}
