# Supported CodeFixes

The following 39 codefixes are supported by Rehearsal, which resolve 103 different TypeScript diagnostics errors.

## Add Missing `async` Keyword

id: _addMissingAsync_

Adds the missing `async` keyword where a promise should be returned.
**Input:**

```ts
interface Stuff {
  b: () => Promise<string>;
}
export function foo(): Stuff {
  return { b: () => 'hello' };
}

```
```ts
interface Stuff {
  b: () => Promise<string>;
}

function foo(): Stuff | Date {
  return { b: (_) => 'hello' };
}

```
```ts
const foo = <T>(x: T): string => {
  await new Promise((resolve) => resolve(true));
  return '';
};

```
**Output:**

```ts
interface Stuff {
  b: () => Promise<string>;
}
export function foo(): Stuff {
  return { b: async () => 'hello' };
}

```
```ts
interface Stuff {
  b: () => Promise<string>;
}
function foo(): Stuff | Date {
  return { b: async (_) => 'hello' };
}

```
```ts
const foo = async <T>(x: T): Promise<string> => {
  await new Promise((resolve) => resolve(true));
  return '';
};

```


## Add Missing `await` Keyword

id: _addMissingAwait_

Adds the missing `await` keyword where a promise should be returned but not being properly handled.
**Input:**

```ts
export async function fn(a: Promise<() => void>) {
  a();
}

```
```ts
async function fn(a: string, b: Promise<string>) {
  const x = b;
  fn(x, b);
  fn(b, b);
}

```
**Output:**

```ts
export async function fn(a: Promise<() => void>) {
  (await a)();
}

```
```ts
async function fn(a: string, b: Promise<string>) {
  const x = await b;
  fn(x, b);
  fn(await b, b);
}

```


## Add `await` To Initializers

id: _addMissingAwaitToInitializer_

Adds missing `await` keyword to declarations and expressions.



## Add Missing Const

id: _addMissingConst_

Adds `const` to all unresolved variables
**Input:**

```ts
export function sound() {
  for (x of []) {
    x;
  }
}

```
**Output:**

```ts
export function sound() {
  for (const x of []) {
    x;
  }
}

```


## Add Missing Type Constraint

id: _addMissingConstraint_

Adds an `extends` keyword to constrain a generic type parameter.
**Input:**

```ts
export function f<T>(x: T) {
  const y: `${number}` = x;
  y;
}

```
**Output:**

```ts
export function f<T extends `${number}`>(x: T) {
  const y: `${number}` = x;
  y;
}

```


## Add Missing Property Declaration

id: _addMissingDeclareProperty_

Adds a `declare` keyword to properties.
**Input:**

```ts
class B {
  p = 1;
}

export class C extends B {
  p: number;
}

```
**Output:**

```ts
class B {
  p = 1;
}

export class C extends B {
  override declare p: number;
}

```


## Add Declaration For Decorator

id: _addMissingInvocationForDecorator_

Turns decorators into invocations where appropriate.
**Input:**

```ts
declare function foo(): (...args: any[]) => void;
export class C {
  @foo
  bar() {}
}

```
**Output:**

```ts
declare function foo(): (...args: any[]) => void;
export class C {
  @foo()
  bar() {}
}

```


## Add `new` Operator

id: _addMissingNewOperator_

Adds `new` operator where it is needed.
**Input:**

```ts
export class C {
  constructor(_num?: number) {}
}
export var b = C(3);

```
**Output:**

```ts
export class C {
  constructor(_num?: number) {}
}
export var b = new C(3);

```


## Add Optional Property

id: _addOptionalPropertyUndefined_

Adds `undefined` to the type of an optional field.



## Add `void` To Promise

id: _addVoidToPromise_

Adds the `void` as the type parameter of `Promise` where appropriate.
**Input:**

```ts
export const p1 = new Promise((resolve) => resolve());

```
**Output:**

```ts
export const p1 = new Promise<void>((resolve) => resolve());

```


## Add Super To Constructor

id: _constructorForDerivedNeedSuperCall_

Adds a call the super class within the constructor.
**Input:**

```ts
class Base {}

export class C extends Base {
  constructor() {}
}

```
**Output:**

```ts
class Base {}

export class C extends Base {
  constructor() {
    super();
  }
}

```


## Convert To Type Export

id: _convertToTypeOnlyExport_

Adds `type` to exports where the entity(s) that is exported is a type(s).
**Input:**

```ts
export { A, B } from '../sample-1.js';

```
**Output:**

```ts
export type { A, B } from '../sample-1.js';

```


## Convert @typedef to Type

id: _convertTypedefToType_

Converts JSDoc typedef to TypeScript type(s).
**Input:**

```ts
/**
 * @typedef {(number|string|undefined)} Foo
 */

```
```ts
/**
 * @typedef {object} Person
 * @property {object} data
 * @property {string} data.name
 * @property {number} data.age
 * @property {object} data.contact
 * @property {string} data.contact.address
 * @property {string} [data.contact.phone]
 */

```
**Output:**

```ts
  type Foo = (number | string | undefined);

```
```ts
  interface Person {
    data: {
      name: string;
      age: number;
      contact: {
        address: string;
        phone?: string;
      };
    };
  }

```


## Convert to Type Only Import

id: _convertToTypeOnlyImport_

Adds `type` to imports where the entity(s) being imported are type(s).
**Input:**

```ts
import { B, C } from '../sample-1.js';

declare const b: B;
declare const c: C;
console.log(b, c);

```
**Output:**

```ts
  import type { B, C } from '../sample-1.js';

declare const b: B;
declare const c: C;
console.log(b, c);

```


## Delete Unused Parameter

id: _deleteUnmatchedParameter_

Deletes parameters that are documented but not in the implementation.
**Input:**

```ts
/**
 * @param {number} a
 * @param {string} b
 */
export function foo(a: number) {
  console.log(a);
}

```
**Output:**

```ts
/**
   * @param {number} a
   */
export function foo(a: number) {
  console.log(a);
}

```


## Convert `extends` To `implements` On Interfaces

id: _extendsInterfaceBecomesImplements_

Converts `extends` to `implements` when interfaces are extended but empty.
**Input:**

```ts
interface I {}
export class C extends I {}

```
**Output:**

```ts
interface I {}
export class C implements I {}

```


## Adds `await` To Sync Function

id: _fixAwaitInSyncFunction_

Add async modifier to containing function.
**Input:**

```ts
export const f = function () {
  await Promise.resolve();
};

```
**Output:**

```ts
export const f = async function () {
  await Promise.resolve();
};

```


## Cannot Find Module

id: _fixCannotFindModule_

Attempts to download type modules for modules that can not be resolved.



## Enable JSX

id: _fixEnableJsxFlag_

When JSX is detected, enable the tsconfig configuration for JSX.



## Fix Import Of Non-Exported Member

id: _fixImportNonExportedMember_

Modifies the file that is being imported to expose the correct members.
**Input:**

```ts
import { T2 } from './fail-1';

```
```ts
const a = 1;
const b = 1;
export { a, b };

type T2 = number;
type T1 = number;
export type { T1 };

```
**Output:**

```ts
import { T2 } from './pass-1';

```
```ts
const a = 1;
const b = 1;
export { a, b };

type T2 = number;
type T1 = number;
export type { T1, T2 };

```


## Add Missing Attribute

id: _fixMissingAttributes_

Adds an attribute to a JSX element if it missing.



## Fix Missing Member

id: _fixMissingMember_

Ensures that there is a type or implementation associated with a member.
**Input:**

```ts
export class C {
  method() {
    this.x = 0;
  }
}

```
**Output:**

```ts
export class C {
  [x: string]: number;
  x: number;
  method() {
    this.x = 0;
  }
}

```


## Add Missing Property

id: _fixMissingProperties_

Adds properties that are missing from objects.
**Input:**

```ts
interface I1 {
  foo: string;
}

export const a: I1 = {};

```
**Output:**

```ts
interface I1 {
  foo: string;
}

export const a: I1 = {
  foo: ""
};

```


## Fix Override Modifier

id: _fixOverrideModifier_

Adds the `override` modifier where the subclass is overriding the method.
**Input:**

```ts
export class B {
  foo(_v: string) {}
  fooo(_v: string) {}
}

export class D extends B {
  fooo(_v: string) {}
}

```
**Output:**

```ts
export class B {
  foo(_v: string) {}
  fooo(_v: string) {}
}

export class D extends B {
  override fooo(_v: string) {}
}

```


## Fix Return Type Of Async Functions

id: _fixReturnTypeInAsyncFunction_

Adds `Promise<...>` to the return type.
**Input:**

```ts
export async function fn(): null {
  return null;
}

```
**Output:**

```ts
export async function fn(): Promise<null> {
  return null;
}

```


## Fix Imports

id: _import_

Fixes missing imports.



## Infer From Usage

id: _inferFromUsage_

Infers the types based on how the value is being used.
**Input:**

```ts
export function f(x, y) {
  x = 0 + x;
  y = '' + y;
}

```
**Output:**

```ts
export function f(x: number, y: string) {
  x = 0 + x;
  y = '' + y;
}

```


## Invalid Import Syntax

id: _invalidImportSyntax_

Fixes issues related to assignability of imports.



## Add Types From JSDoc

id: _jdocTypes_

Annotates code with the types from the declared JSDoc comments.



## Remove Unnecessary Await

id: _removeUnnecessaryAwait_

Removes `await` where the function is not async.
**Input:**

```ts
export function foo() {
  return 1;
}

await foo();

```
**Output:**

```ts
export function foo() {
  return 1;
}

  foo();

```


## Strict Class Initialization

id: _strictClassInitialization_

Fixes classes so they are initialized correctly.



## Use Default Import

id: _useDefaultImport_

Converts namespaced import default imports.



## Annotate Strict Types From JSDoc

id: _annotateWithStrictTypeFromJSDoc_

Annotates code with the only strict types from the declared JSDoc comments. Strict replacement for annotateWithTypeFromJSDoc



## Add Error Cast

id: _addErrorTypeGuard_

Adds a cast to Error objects in catch clauses



## Add Missing Types From Inheritance Chain

id: _addMissingTypesBasedOnInheritance_

Adds types to sub-class by looking at the types from the heritage.



## Make Member Optional

id: _makeMemberOptional_

Safely makes the access to properties optional.



## Add Missing Export

id: _addMissingExport_

Exports members that are required and used by other exports.



## Add Missing Return Type

id: _inferReturnType_

Adds the return type to methods and functions.



