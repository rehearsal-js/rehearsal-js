import Component from "@glimmer/component";

export default class WithMissingInterface extends Component {
  name = "Bob";

  <template>
    <span>Hello, I am {{this.name}} and I am {{@age}} years old!</span>
    <span>My favorite snack is {{@snack}}.</span>
  </template>
}
