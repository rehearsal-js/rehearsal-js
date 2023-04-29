import Component from "@glimmer/component";
import { inject as service } from "@ember/service";

export default class SomeComponent extends Component {
  @service("boo-service") booService;

  @service gooService;

  @service mooService;
}
