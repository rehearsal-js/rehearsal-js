# Supported CodeFixes

The following codefixes are supported by Rehearsal.

## Add Missing `async` Keyword
Adds the missing `async` keyword where a promise should be returned.

**Input:**
```ts

      interface Stuff {
          b: () => Promise<string>;
      }

      function foo(): Stuff | Date {
          return {
              b: () => "hello",
          }
      }
      
```
```ts

      interface Stuff {
          b: () => Promise<string>;
      }

      function foo(): Stuff | Date {
          return {
              b: _ => "hello",
          }
      }
      
```
```ts

      const foo = <T>(x: T): string => {
          await new Promise(resolve => resolve(true));
          return "";
      }
      
```
**Output:**
```ts

      interface Stuff {
        b: () => Promise<string>;
      }

      function foo(): Stuff | Date {
          return {
              b: async () => "hello",
          }
      }
      
```
```ts

      interface Stuff {
        b: () => Promise<string>;
      }

      function foo(): Stuff | Date {
          return {
              b: async (_) => "hello",
          }
      }
      
```
```ts

      const foo = async <T>(x: T): Promise<string> => {
        await new Promise(resolve => resolve(true));
        return "";
      }
```

## Add Missing `await` Keyword
Adds the missing `await` keyword where a promise should be returned but not being properly handled.

**Input:**
```ts

      async function fn(a: Promise<() => void>, b: Promise<() => void> | (() => void), C: Promise<{ new(): any }>) {
        a();
        b();
        new C();
      }
      
```
```ts

      async function fn(a: string, b: Promise<string>) {
        const x = b;
        fn(x, b);
        fn(b, b);
      }
      
```
```ts

      async function fn(a: Promise<() => void>, b: Promise<() => void> | (() => void), C: Promise<{ new(): any }>) {
        a()
        b()
        new C()
      }
      
```
```ts

      async function fn(a: Promise<string[]>) {
        if (a) {};
        a ? fn.call() : fn.call();
      }
      
```
**Output:**
```ts

      async function fn(a: Promise<() => void>, b: Promise<() => void> | (() => void), C: Promise<{ new(): any }>) {
        (await a)();
        (await b)();
        new (await C)();
      }
      
```
```ts

      async function fn(a: string, b: Promise<string>) {
        const x = await b;
        fn(x, b);
        fn(await b, b);
      }
      
```
```ts

      async function fn(a: Promise<() => void>, b: Promise<() => void> | (() => void), C: Promise<{ new(): any }>) {
        (await a)()
        ;(await b)()
        new (await C)()
      }
      
```
```ts

      async function fn(a: Promise<string[]>) {
        if (await a) {};
        a ? fn.call() : fn.call();
      }
      
```

## Add `await` To Intializers


**Input:**

**Output:**


## Add Missing Const
Adds `const` to all unresolved variables

**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


## 


**Input:**

**Output:**


