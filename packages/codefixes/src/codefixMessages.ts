import { Diagnostics } from './diagnosticInformationMap.generated.js';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const fixes = () => ({
  addMissingAsync: {
    title: 'Add Missing `async` Keyword',
    description: 'Adds the missing `async` keyword where a promise should be returned.',
    diagnostics: [2345, 2322, 2678],
    passing: [
      `
      interface Stuff {
        b: () => Promise<string>;
      }

      function foo(): Stuff | Date {
          return {
              b: async () => "hello",
          }
      }
      `,
      `
      interface Stuff {
        b: () => Promise<string>;
      }

      function foo(): Stuff | Date {
          return {
              b: async (_) => "hello",
          }
      }
      `,
      `
      const foo = async <T>(x: T): Promise<string> => {
        await new Promise(resolve => resolve(true));
        return "";
      }`,
    ],
    failing: [
      `
      interface Stuff {
          b: () => Promise<string>;
      }

      function foo(): Stuff | Date {
          return {
              b: () => "hello",
          }
      }
      `,
      `
      interface Stuff {
          b: () => Promise<string>;
      }

      function foo(): Stuff | Date {
          return {
              b: _ => "hello",
          }
      }
      `,
      `
      const foo = <T>(x: T): string => {
          await new Promise(resolve => resolve(true));
          return "";
      }
      `,
    ],
  },
  addMissingAwait: {
    title: 'Add Missing `await` Keyword',
    description:
      'Adds the missing `await` keyword where a promise should be returned but not being properly handled.',
    diagnostics: [
      2356, 2362, 2363, 2736, 2365, 2367, 2801, 2461, 2495, 2802, 2549, 2548, 2488, 2504, 2345,
      2339, 2349, 2351,
    ],
    passing: [
      `
      async function fn(a: Promise<() => void>, b: Promise<() => void> | (() => void), C: Promise<{ new(): any }>) {
        (await a)();
        (await b)();
        new (await C)();
      }
      `,
      `
      async function fn(a: string, b: Promise<string>) {
        const x = await b;
        fn(x, b);
        fn(await b, b);
      }
      `,
      `
      async function fn(a: Promise<() => void>, b: Promise<() => void> | (() => void), C: Promise<{ new(): any }>) {
        (await a)()
        ;(await b)()
        new (await C)()
      }
      `,
      `
      async function fn(a: Promise<string[]>) {
        if (await a) {};
        a ? fn.call() : fn.call();
      }
      `,
    ],
    failing: [
      `
      async function fn(a: Promise<() => void>, b: Promise<() => void> | (() => void), C: Promise<{ new(): any }>) {
        a();
        b();
        new C();
      }
      `,
      `
      async function fn(a: string, b: Promise<string>) {
        const x = b;
        fn(x, b);
        fn(b, b);
      }
      `,
      `
      async function fn(a: Promise<() => void>, b: Promise<() => void> | (() => void), C: Promise<{ new(): any }>) {
        a()
        b()
        new C()
      }
      `,
      `
      async function fn(a: Promise<string[]>) {
        if (a) {};
        a ? fn.call() : fn.call();
      }
      `,
    ],
  },
  addMissingAwaitToInitializer: {
    title: 'Add `await` To Intializers',
    description: Diagnostics.Add_await_to_initializers.message,
    diagnostics: [95084, 95089],
    passing: [],
    failing: [],
  },
  addMissingConst: {
    title: 'Add Missing Const',
    description: 'Adds `const` to all unresolved variables',
    diagnostics: [2304, 18004],
    passing: [],
    failing: [],
  },
  addMissingConstraint: {
    title: '',
    description: '',
    diagnostics: [2678, 2719, 2375, 2322, 2379, 2530, 2603, 2344],
    passing: [],
    failing: [],
  },
  addMissingDeclareProperty: {
    title: '',
    description: '',
    diagnostics: [2612],
    passing: [],
    failing: [],
  },
  addMissingInvocationForDecorator: {
    title: '',
    description: '',
    diagnostics: [1329],
    passing: [],
    failing: [],
  },
  addMissingNewOperator: {
    title: '',
    description: '',
    diagnostics: [2348],
    passing: [],
    failing: [],
  },
  addOptionalPropertyUndefined: {
    title: '',
    description: '',
    diagnostics: [2412, 2375, 2379],
    passing: [],
    failing: [],
  },
  addVoidToPromise: {
    title: '',
    description: '',
    diagnostics: [2810, 2794],
    passing: [],
    failing: [],
  },
  annotateWithTypeFromJSDoc: {
    title: '',
    description: '',
    diagnostics: [80004],
    passing: [],
    failing: [],
  },
  constructorForDerivedNeedSuperCall: {
    title: '',
    description: '',
    diagnostics: [2377],
    passing: [],
    failing: [],
  },
  convertFunctionToEs6Class: {
    title: '',
    description: '',
    diagnostics: [80002],
    passing: [],
    failing: [],
  },
  convertToTypeOnlyExport: {
    title: '',
    description: '',
    diagnostics: [1205],
    passing: [],
    failing: [],
  },
  convertToTypeOnlyImport: {
    title: '',
    description: '',
    diagnostics: [1371, 1484],
    passing: [],
    failing: [],
  },
  deleteUnmatchedParameter: {
    title: '',
    description: '',
    diagnostics: [8024],
    passing: [],
    failing: [],
  },

  extendsInterfaceBecomesImplements: {
    title: '',
    description: '',
    diagnostics: [2689],
    passing: [],
    failing: [],
  },
  fixAwaitInSyncFunction: {
    title: '',
    description: '',
    diagnostics: [1308, 1103, 2311],
    passing: [],
    failing: [],
  },
  fixCannotFindModule: {
    title: '',
    description: '',
    diagnostics: [2307, 7016],
    passing: [],
    failing: [],
  },
  fixEnableJsxFlag: {
    title: '',
    description: '',
    diagnostics: [17004],
    passing: [],
    failing: [],
  },
  fixImportNonExportedMember: {
    title: '',
    description: '',
    diagnostics: [2459],
    passing: [],
    failing: [],
  },
  fixMissingAttributes: {
    title: '',
    description: '',
    diagnostics: [2339, 2551, 2741, 2739, 2740, 2345, 2304],
    passing: [],
    failing: [],
  },
  fixMissingMember: {
    title: '',
    description: '',
    diagnostics: [2339, 2551, 2741, 2739, 2740, 2345, 2304],
    passing: [],
    failing: [],
  },
  fixMissingProperties: {
    title: '',
    description: '',
    diagnostics: [2339, 2551, 2741, 2739, 2740, 2345, 2304],
    passing: [],
    failing: [],
  },
  fixOverrideModifier: {
    title: '',
    description: '',
    diagnostics: [4113, 4112, 4116, 4114, 4115, 4119, 4121, 4120, 4122],
    passing: [],
    failing: [],
  },
  fixReturnTypeInAsyncFunction: {
    title: '',
    description: '',
    diagnostics: [1064],
    passing: [],
    failing: [],
  },
  import: {
    title: '',
    description: '',
    diagnostics: [2304, 2552, 2663, 2662, 2503, 2686, 2693, 18004, 1361],
    passing: [],
    failing: [],
  },
  inferFromUsage: {
    title: '',
    description: '',
    diagnostics: [
      7034, 7005, 7006, 7019, 7033, 7010, 7032, 7008, 7046, 7043, 7044, 7047, 7048, 7050, 7049,
      7045, 2683,
    ],
    passing: [],
    failing: [],
  },
  invalidImportSyntax: {
    title: '',
    description: '',
    diagnostics: [2345, 2344, 2322, 2719, 1226, 2411, 2413, 2416, 2603, 2606, 2684, 2349, 2351],
    passing: [],
    failing: [],
  },
  jdocTypes: {
    title: '',
    description: '',
    diagnostics: [90014],
    passing: [],
    failing: [],
  },
  removeUnnecessaryAwait: {
    title: '',
    description: '',
    diagnostics: [80007],
    passing: [],
    failing: [],
  },
  requireInTs: {
    title: '',
    description: '',
    diagnostics: [80005],
    passing: [],
    failing: [],
  },
  strictClassInitialization: {
    title: '',
    description: '',
    diagnostics: [2564],
    passing: [],
    failing: [],
  },
  unusedIdentifier: {
    title: '',
    description: '',
    diagnostics: [6133, 6196, 6138, 6192, 6198, 6199, 6205],
    passing: [],
    failing: [],
  },
  useDefaultImport: {
    title: '',
    description: '',
    diagnostics: [80003],
    passing: [],
    failing: [],
  },
});
