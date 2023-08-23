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

    <span>Hello, I am {{this.test}} and I am {{@test2}} years old!</span>
  </template>
}

export class Something2 extends Component {
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

<span>Hello, I am {{this.test}} and I am {{@test2}} years old!</span>
</template>
}
