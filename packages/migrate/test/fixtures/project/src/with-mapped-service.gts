import Component from "@glimmer/component";
import { inject as service } from "@ember/service";

export default class TestWithMappedServiceGts extends Component {
  @service("boo-service") booService;

  @service gooService;

  @service mooService;

  <template>
    <span>Hello, I am human, and I am 10 years old!</span>
  </template>
}
