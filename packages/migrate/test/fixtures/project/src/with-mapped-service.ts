import Component from "@glimmer/component";
import { inject as service } from "@ember/service";

export default class SomeTsComponent extends Component {
  @service("boo-service") booService;

  @service("@some-org/some-package@mapped") something;

  @service gooService;

  @service mooService;
}
