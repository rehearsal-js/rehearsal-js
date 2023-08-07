import Component from '@glimmer/component';

export default class AudienceDemographics extends Component {
  /**
   * List of items to be rendered in the bar chart
   * @typedef {{ count: number }} HeadCount
   * @returns {HeadCount}
   */
  get something() {
    return {
      count: this.args.someNumber,
    };
  }
}
