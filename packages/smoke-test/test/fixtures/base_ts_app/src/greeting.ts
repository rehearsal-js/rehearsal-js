class Greeting<T> {
  phrase;
  constructor(phrase) {
    this.phrase = phrase;
  }
}

class Salutation {
  constructor() {}

  say(arg1: boolean, arg2: boolean) {
    let result;

    if (arg1) {
      result = 'Hello';
    } else if (arg2) {
      result = new Greeting<string>('Hey');
    } else {
      result = Promise.resolve(new Greeting<string>('Hola'));
    }

    return result;
  }
}
