export function test1() {
  return 'Test this';
}

export const test2 = () => console.log('Test this');

export const test3 = () => 'Test this';

export function test4<Type>(arg: Array<Type>) {
  return arg;
}

export async function test5() {
  return new TestClass();
}

interface TestInterface {
  test1(): string | undefined;
}

class BaseTestClass {
  test2(param: boolean): number | string {
    return param ? 0 : '0';
  }
}

export class TestClass extends BaseTestClass implements TestInterface {
  test1() {
    return undefined;
  }

  test2() {
    return 0;
  }
}
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
      return foo(Math.random());
    }

    return result;
  }
}

function foo(number: number) {
  if (number % 6) {
    return 'mod6';
  }
  if (number % 2) {
    return number;
  }

  return Promise.resolve(number);
}
