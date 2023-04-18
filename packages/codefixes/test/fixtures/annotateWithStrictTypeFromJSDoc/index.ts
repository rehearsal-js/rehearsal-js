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
