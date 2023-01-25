import { salutations, DEFAULT_GREETING } from './salutations';

export function hasGreeting(g) {
  return salutations.find((s) => s == g) || DEFAULT_GREETING;
}

export function findGreeting(someGreeting) {
  const greeting = salutations.find((g) => {
    return g == someGreeting;
  });
  return greeting;
}

export default function say(name = 'World') {
  return `Hello ${name}`;
}

/**
 * @param {String} a - A string
 * @returns {Promise} the promise that resolves when the request has been resumed
 */
export function jsdoc(a) {
  return Promise.resolve()
}
