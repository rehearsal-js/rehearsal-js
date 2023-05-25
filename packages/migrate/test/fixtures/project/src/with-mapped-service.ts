import Component from "@glimmer/component";
import { inject as service } from "@ember/service";

export default class SomeTsComponent extends Component {
  @service("boo-service") booService;

  @service gooService;

  @service mooService;
}
