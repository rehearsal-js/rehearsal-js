// Use Case
//
// In the folllowing code, an inlay hint will sugggest a return type
// for `someFunctionWithManyReturnTypes` with the following:
// `: string | Greeting<string> |...`
// Any suggestions with three-periods should NOT be added.

class Greeting<T> {
  phrase;
  constructor(phrase) {
    this.phrase = phrase;
  }
}

class SomeClass {
  constructor() {}

  someFunctionWithManyReturnTypes(arg1: boolean, arg2: boolean) {
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
