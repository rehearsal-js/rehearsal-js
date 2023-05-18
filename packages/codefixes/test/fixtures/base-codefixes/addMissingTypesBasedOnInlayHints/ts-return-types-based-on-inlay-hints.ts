export function test1() {
  return 'Test this';
}

export const test2 = () => console.log('Test this')

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
  };
}

export class TestClass extends BaseTestClass implements TestInterface {
  test1() {
    return undefined;
  }

  test2() {
    return 0;
  }
}
