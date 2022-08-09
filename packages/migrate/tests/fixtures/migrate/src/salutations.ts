export type Greeting = {
  locale: string;
  phrase: string;
};

export const salutations : Array<Greeting> = [
  { locale: 'en_US', phrase: 'Hello' },
  { locale: 'fr_FR', phrase: 'Bonjour' },
  { locale: 'es_ES', phrase: 'Hola' },
];

export const DEFAULT_GREETING: Greeting  = salutations[0];
