import { Component } from 'react';

function action(_target: unknown, propertyKey: string): void {
  console.log(propertyKey);
}

/**
 * The Radio component is to display a list of radio options
 */
export class Radio extends Component {
  args = {
    onChange: async (one: boolean, two: boolean, v: boolean): Promise<boolean> => one || two || v
  };

  one = true;
  two = false;

  /**
   * Action
   * @return {string}
   */
  @action
  async onRadioChange(value) {
    this.one = true;
    this.two = false;

    this.args.onChange(this.one, this.two, value)
      .then((status) => {
        if (status) {
          this.one = false;
        } else {
          this.two = true;
        }
      })
      .catch(() => {
        this.two = this.one;
      });
  }
}
