function action(_target: unknown, propertyKey: string): void {
  console.log(propertyKey);
}

/**
 * Breakpoint Map
 * @type {Object<string, number>}
 */
const breakpointMap = { s: 1, m: 2, l: 3 };

/**
 * Ordered Breakpoints
 * @type {Array<[string, number]>}
 */
const orderedBreakpointsLongNameConstant = Object.entries(breakpointMap).sort(
  (a, b) => a[1] - b[1]
);

export class Foo {
  /**
   * Size
   * @type {string}
   */
  @action size = 'l';

  /**
   * Viewport Width
   * @type {string}
   */
  @action viewportWidth;

  /**
   * Foo Method
   * @param {string} size
   * @returns {boolean}
   */
  fooMethod(size) {
    const nextBreakpointIndex =
      orderedBreakpointsLongNameConstant.indexOf(
        orderedBreakpointsLongNameConstant.find(([key]) => key === size)
      ) + 1;
    if (nextBreakpointIndex < orderedBreakpointsLongNameConstant.length) {
      return this.viewportWidth >= orderedBreakpointsLongNameConstant[nextBreakpointIndex][1];
    }

    return false;
  }

  /**
   * Is Equal
   * @param {string} size
   * @returns {boolean}
   */
  isEqual(size) {
    return this.size === size;
  }

  /**
   * Is Less
   * @param {string} size
   * @returns {boolean}
   */
  isLess(size) {
    return this.viewportWidth < breakpointMap[size];
  }
}
