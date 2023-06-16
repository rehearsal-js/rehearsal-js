import Component from "@glimmer/component";

export default class Salutation extends Component {
  get nickname() {
    return this.args.nickname ?? "Unknown";
  }
}
