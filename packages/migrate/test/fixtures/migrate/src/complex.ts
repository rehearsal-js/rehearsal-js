import { salutations, DEFAULT_GREETING } from './salutations';
import { v4 as uuid } from 'uuid';

uuid();

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
