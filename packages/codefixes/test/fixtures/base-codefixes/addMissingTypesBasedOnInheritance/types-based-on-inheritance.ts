// Basics

class Animal {
  title: string = '';

  test(test: string): string {
    return test;
  }

  say(message: string): string {
    return message;
  }

  feed(food: Food, quantity: number): boolean {
    console.log(food, quantity);
    return false;
  }
}

interface Wild {
  wild(place: string): string;
}

interface Happy {
  happy(num: number): void;
}

class Food {
  title: string;

  constructor(title: string) {
    this.title = title;
  }
}

class Dog extends Animal {
  say(message) {
    console.log(message);
    return 'bar';
  }
}

export class WildDog extends Dog implements Wild, Happy {
  say(message) {
    console.log(message);
    return 'bar';
  }

  override feed(food, quantity) {
    console.log(food, quantity);
    return true;
  }

  wild(place) {
    return place;
  }

  happy(num) {
    console.log(num);
  }
}

export class Cat extends Animal {
  override say(text) {
    console.log(text);
    return 'meo';
  }

  feed(something) {
    console.log(something);
    return false;
  }
}

// Generics

type Thing = {
  foo: number;
};

// Generic Interfaces

interface GenericThingInterface<A = number, B = string> {
  thing(a: A, b: B): void;
}

interface ConstrainedThingInterface<C extends Thing> {
  thing(c: C): void;
}

export class GenericThingImp1 implements GenericThingInterface {
  thing(a, b) {
    console.log(a, b);
  }
}

export class GenericThingImp2 implements GenericThingInterface<boolean, number> {
  thing(a, b) {
    console.log(a, b);
  }
}

export class GenericThingImp3 implements ConstrainedThingInterface<{ foo: number; bar: string }> {
  thing(c) {
    console.log(c);
  }
}

// Generic Classes

class GenericThingClass<A = number, B = string> {
  thing(a: A, b: B) {
    console.log(a, b);
  }
}

class ConstrainedThingClass<C extends Thing> {
  thing(c: C) {
    console.log(c);
  }
}

export class GenericThingExt1 extends GenericThingClass {
  thing(a, b) {
    console.log(a, b);
  }
}

export class GenericThingExt2 extends GenericThingClass<boolean, number> {
  thing(a, b) {
    console.log(a, b);
  }
}

export class GenericThingExt3 extends ConstrainedThingClass<{ foo: number; bar: string }> {
  thing(c) {
    console.log(c);
  }
}

// Multiple signatures

interface MultipleInterface {
  foo(a: number): number;
  foo(b: string): string;
  foo(a: number, b: string): boolean;

  moo(a: string): string;
}

class MultipleClass {
  boo(a: number): number;
  boo(b: string): string;
  boo(a: number, b: string): boolean;
  boo(ab: number | string, b?: string): number | string | boolean {
    return !ab || !b;
  }
}

export class MultipleImpl extends MultipleClass implements MultipleInterface {
  boo(ab, b?) {
    return !ab || !b;
  }

  foo(ab, b?) {
    return !ab || !b;
  }

  moo(b) {
    return b;
  }
}
