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
  say(message: string) {
    console.log(message);
    return 'bar';
  }
}

export class WildDog extends Dog implements Wild, Happy {
  say(message: string) {
    console.log(message);
    return 'bar';
  }

  override feed(food: Food, quantity: number) {
    console.log(food, quantity);
    return true;
  }

  wild(place: string) {
    return place;
  }

  happy(num: number) {
    console.log(num);
  }
}

export class Cat extends Animal {
  override say(text: string) {
    console.log(text);
    return 'meo';
  }

  feed(something: Food) {
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
  thing(a: number, b: string) {
    console.log(a, b);
  }
}

export class GenericThingImp2 implements GenericThingInterface<boolean, number> {
  thing(a: boolean, b: number) {
    console.log(a, b);
  }
}

export class GenericThingImp3 implements ConstrainedThingInterface<{ foo: number; bar: string }> {
  thing(c: { foo: number; bar: string; }) {
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
  thing(a: number, b: string) {
    console.log(a, b);
  }
}

export class GenericThingExt2 extends GenericThingClass<boolean, number> {
  thing(a: boolean, b: number) {
    console.log(a, b);
  }
}

export class GenericThingExt3 extends ConstrainedThingClass<{ foo: number; bar: string }> {
  thing(c: { foo: number; bar: string; }) {
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
/* @ts-expect-error @rehearsal TODO TS2416: Property 'boo' in type 'MultipleImpl' is not assignable to the same property in base type 'MultipleClass'..  Type '(ab: any, b?: any) => boolean' is not assignable to type '{ (a: number): number; (b: string): string; (a: number, b: string): boolean; }'..    Type 'boolean' is not assignable to type 'number'. */
  boo(ab, b?) {
    return !ab || !b;
  }

/* @ts-expect-error @rehearsal TODO TS2416: Property 'foo' in type 'MultipleImpl' is not assignable to the same property in base type 'MultipleInterface'..  Type '(ab: any, b?: any) => boolean' is not assignable to type '{ (a: number): number; (b: string): string; (a: number, b: string): boolean; }'..    Type 'boolean' is not assignable to type 'number'. */
  foo(ab, b?) {
    return !ab || !b;
  }

  moo(b: string) {
    return b;
  }
}
