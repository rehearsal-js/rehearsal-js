import Component from '@glimmer/component';
import { inject as service } from '@ember/service';

/** @type { FakeType } */
export const x = 0;

export default class Hello extends Component {
  name = 'world';

  test(...args) {

  }

  <template>
    <span>Hello, I am {{this.name}} and I am {{@age}} years old!</span>
  </template>
}


export class Foo {
  value = 0;
}

export class GenericClass<something = number, somethingElse = number> {
  thing(a: something, b: somethingElse) {
    console.log(a, b);
  }
}

/** @type {number | string} */
export const a = 0;

/** @type {number | string | UnavailableType} */
export const b = 0;

/** @type {GenericClass<string, string, string>} */
export const c = 0;

export class ThinkClass {
  /** @type {number | null} */
  a = 0;

  /** @type {number | UnavailableType} */
  b = 0;

  /**
   * JSDoc
   *
   * @param {number} a                                //
   * @param {(string|number)} b                       // ParenthesizedType.type => UnionType
   * @param {Foo} c                                   // TypeReference
   * @param {number|UnavailableType} d                // UnionType
   * @param {() => boolean} e                         // FunctionType
   * @param {GenericClass<string, string>} f          // TypeReference

   * @param {<callbackFunction>} g                    // FunctionType

   * @param {UnavailableType} h                       // TypeReference
   * @param {Foo|UnavailableType} i                   // UnionType
   * @param {() => UnavailableType} j                 // FunctionType
   * @param {GenericClass<string, UnavailableType>} k // TypeReference
   * @param {number|() => UnavailableType} l          // UnionType
   * @param {(a: UnavailableType) => void} m          // FunctionType
   * @param {(a, b: string) => void} n                // FunctionType

   * @param {GenericClass<string, string, string>} o  // TypeReference... 3 args instead of 2

   * @param {{ a: string, b: Date }} p
   * @param {{ a: string, b: UnavailableType }} q
   * @param {function(this:{ a: string}, string, number): boolean} r

   * @return {void}
   */
  more(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s) {
    return console.log(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s);
  }

  /**
   * Some function
   * @param {UnavailableType} a
   * @return {UnavailableType}
   */
  twice(a) {
    return a;
  }
}

/**
 * JSDoc
 *
 * @param {number} a                                //
 * @param {(string|number)} b                       // ParenthesizedType.type => UnionType
 * @param {Foo} c                                   // TypeReference
 * @param {number|UnavailableType} d                // UnionType
 * @param {() => boolean} e                         // FunctionType
 * @param {GenericClass<string, string>} f          // TypeReference

 * @param {<callbackFunction>} g                    // FunctionType

 * @param {UnavailableType} h                       // TypeReference
 * @param {Foo|UnavailableType} i                   // UnionType
 * @param {() => UnavailableType} j                 // FunctionType
 * @param {GenericClass<string, UnavailableType>} k // TypeReference
 * @param {number|() => UnavailableType} l          // UnionType
 * @param {(a: UnavailableType) => void} m          // FunctionType
 * @param {(a, b: string) => void} n                // FunctionType

 * @param {GenericClass<string, string, string>} o  // TypeReference... 3 args instead of 2

 * @param {{ a: string, b: Date }} p                //
 * @param {{ a: string, b: UnavailableType }} q     //
 * @param {function(this:{ a: string}, string, number): boolean} r

 * @return {void}
 */
export function think(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s) {
  return console.log(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s);
}

/**
 * Some function
 * @param {UnavailableType} a
 * @return {UnavailableType}
 */
export function thinkTwice(a) {
  return a;
}

/**
 * The return type is throwing an error
 * @param {[number, number]} a-and-b
 * @param {Array<string>} c
 * @return {Array<{content: string}>}
 */
export function issueWithTheReturnType([a, b], c) {
  a; b; c;
  return c;
}

/**
 * The example of type inference of destructured parameters
 * @param {[number, number]} a-and-b
 * @param {[string, string]} the next one
 * @param {boolean} e
 * @return void
 */
export function inferenceOfDestructuredParams([a, b], [c, d], e) {
  a; b; c; d; e;
}
