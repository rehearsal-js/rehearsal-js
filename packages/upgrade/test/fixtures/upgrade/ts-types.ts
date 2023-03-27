export function test1(me) {
  return 'This is ' + me;
}

test1('test');

/**
 * JSDoc
 * @param {number} me
 * @return {string}
 */
export function test2(me) {
  return me.toString();
}

test2(0);

/**
 * JSDoc is ignored
 * @param {number} me
 * @return {string}
 */
export function test3(me) {
  return me.toString();
}

/* @ts-expect-error @rehearsal TODO TS2345: Argument of type 'string' is not assignable to parameter of type 'number'. Consider verifying both types, using type assertion: '('O' as string)', or using type guard: 'if ('O' instanceof string) { ... }'. */
test3('O');

export class A {
  /**
   * JSDoc
   * @param {number} me
   * @return {string}
   */
  test4(me) {
    return me.toString(2);
  }
}

export class Foo {
  value = 0;

  get foo() {
    return this.value;
  }

  set foo(value) {
    this.value = value;
  }

  boo(value) {
    this.value = value;

    if (this.value) {
      return null;
    } else {
      return this.value;
    }
  }
}

/**
 * JSDoc
 *
 * @param {number} a
 * @param {(string|number)} b
 * @param {<callbackFunction>} c
 * @param {UnavailableType} d
 *
 * @return {void}
 */
export function think(a, b, c, d) {
  return console.log(a, b, c, d);
}