import Component from "@glimmer/component";

export class PrintDate extends Component {
  <template>
    <span>{{@month}} {{@day}}, {{@year}}</span>
  </template>
}

interface ProfileSummarySignature {
  Args: {};
}

/**
 * @extends {Component<ProfileSummarySignature>}
 */
export class ProfileSummary extends Component {
  name = "Bob";

  <template>
    <PrintDate @year={{2023}} @month={{"January"}} @day={{1}} />
    <span>Hello, I am {{this.name}} and I am {{@age}} years old!</span>
    <span>My favorite snack is {{@snack}}.</span>
  </template>
}

/**
 * @typedef HelloWorldCommentSignature
 * @property {HelloWorldCommentArgs} Args
 */

/**
 * @typedef HelloWorldCommentArgs
 * @property {number} age - years since date of birth
 * @property {string} snack - a food to eat between meals
 * @property {string} talent - some talent not on profile
 */

/**
 * @extends {Component<HelloWorldCommentSignature>}
 */
export default class HelloWorld extends Component {
  name = "world";

  <template>
    <ProfileSummary @age={{@age}} @snack={{@snack}} />
    My talent is
    {{@talent}}
  </template>
}
