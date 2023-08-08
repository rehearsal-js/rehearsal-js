export class Example {
  /**
   * @typedef {{ count: number }} Counter
   * @returns {Counter}
   */
  something() {
    return { count: 0 };
  }

  // @typedef {{ count: number }} Counter
  somethingElse() {
    return { count: 0 };
  }

  somethingDifferent() {
    /**
     * @typedef {{ count: number }} Counter
     */
    return { count: 0 };
  }
}
