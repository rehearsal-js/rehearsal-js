/* eslint-disable ember/no-classic-components, ember/require-tagless-components */
import Component from '@ember/component';

export default class EmberComponent extends Component {
  public hasDefault = 'defaultValue';
  public showFunctionHelpers = false;

  public isLongString(value) {
    return value.length > 5;
  }

  public checkTypes() {
    const required = this.required;
    const hasDefault = this.hasDefault;
    const optional = this.optional;

    return { required, hasDefault, optional };
  }
}
