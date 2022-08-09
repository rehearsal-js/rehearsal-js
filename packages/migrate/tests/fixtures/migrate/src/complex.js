import { salutations, DEFAULT_GREETING } from './salutations';

export function hasGreeting(g) {
  return salutations.find((s) => s == g) || DEFAULT_GREETING;
}

export function find(someGreeting) {
  const greeting = salutations.find((g) => {
    return g == someGreeting;
  });
  return greeting;
}

export default function say(name = 'World') {
  return `Hello ${name}`;
}
