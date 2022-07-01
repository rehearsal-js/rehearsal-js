import { salutations, DEFAULT_GREETING } from './some-util';

export function hasGreeting(g) {
  return salutations.find((s) => s == g) || DEFAULT_GREETING;
}

export function find(somePhrase) {
  const greeting = salutations.find((g) => {
    return g.phrase == somePhrase;
  });
  return greeting;
}

export default function say(name = 'World') {
  return `Hello ${name}`;
}
