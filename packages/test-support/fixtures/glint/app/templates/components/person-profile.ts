import Component from '@glimmer/component';
import '@glint/environment-ember-loose';

export default class PersonProfileComponent extends Component {
  get displayName() {
    let { title, firstName, lastName } = this.args.person;

    if (title) {
      return `${title} ${lastName}`;
    } else {
      return `${firstName} ${lastName}`;
    }
  }
}