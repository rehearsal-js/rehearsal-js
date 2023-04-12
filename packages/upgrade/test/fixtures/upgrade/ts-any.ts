/**
 * @param {String} a - some string
 * @param {any} b - hardcoded to any just for demonstrative purposes
 */
export function oneOfParamsHaveAny(a, b) {
  console.log(a, b);
}

/**
 * @param {String} a - some string
 * @param {string | any} b - hardcoded to any just for demonstrative purposes
 */
export function oneOfParamsHaveSomethingOrAny(a, b) {
  console.log(a, b);
}

/**
 * @param {String} a - A string
 * @returns {Promise} the promise that resolves when the request has been resumed
 */
export function returnTypeHasGenericAny(a) {
  return Promise.resolve(a);
}

/**
 * @param {String} a - some string
 * @param {any} b - hardcoded to any just for demonstrative purposes
 * @param {object} c
 * @returns {Promise} the promise that resolves when the request has been resumed
 */
export function oneOfParamsHaveAnyAndReturnHasGenericAny(a, b, c) {
  return Promise.resolve([a, b, c]);
}

/**
 * @param {String} a - some string
 * @param {any} b - hardcoded to any just for demonstrative purposes
 * @returns {any} - just return something
 */
export function oneOfParamsHaveAnyAndReturnIsAny(a, b) {
  console.log(a);
  return b;
}

function capitalize(str: string): string {
  return str[0].toUpperCase() + str.substring(1);
}

export function doSomething(args, name) {
  if (!name) {
    return;
  }
  if (args && args.length < 2) {
    return;
  }
  return capitalize(name);
}

export function handle(text: string, handler) {
  return handler.string(text);
}

const models = new WeakMap();

export function collectModel(model, value) {
  models.set(model, value);
}
