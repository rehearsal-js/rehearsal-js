export class Something {
  /**
   * @param {Event} -- Something
   * @param {string} -- Another
   * @param {*} -- I don't know
   */

  reset(...args) {
    console.log(args);
  }

  shouldExist() {
    console.log('should exist in output');
  }
}
