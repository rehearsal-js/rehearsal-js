import Component from "@glimmer/component";

export class Something extends Component {
  /**
   * @param {Event} -- Something
   * @param {string} -- Another
   * @param {*} -- I don't know
   */

  reset(...args) {
    console.log(args);
  }

  shouldExist() {
    console.log("should exist in output");
  }

  <template>
    <span>Hello, I am {{this.name}} and I am {{@age}} years old!</span>
  </template>
}
