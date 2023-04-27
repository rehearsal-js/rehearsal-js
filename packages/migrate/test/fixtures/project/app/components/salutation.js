import Component from "@glimmer/component";
import { inject as service } from "@ember/service";

export default class Salutation extends Component {
  @service locale;
  get name() {
    if (this.locale.current() == "en-US") {
      return "Bob";
    }
    return "Unknown";
  }
}
