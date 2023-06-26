import { beforeEach, describe, expect, test } from 'vitest';
import ts, { isClassDeclaration, isIdentifier, isInterfaceDeclaration } from 'typescript';
import { getClassByName } from '@rehearsal/ts-utils';
import {
  getClassNameFromClassDeclaration,
  getComponentSignatureInterfaceNode,
  getPropertyOnComponentSignatureInterface,
  getIdentifierForComponent,
  getJSDocExtendsTagWithSignature,
  getNearestComponentClassDeclaration,
  getComponentSignatureName,
  hasComponentSignature,
  hasPropertyOnComponentSignatureInterface,
  parse,
} from '../src/fixes/glint/glint-parsing-utils.js';

describe('glint-parsing-utils', () => {
  let sourceFile: ts.SourceFile;
  let classDeclaration: ts.ClassDeclaration;

  const fixture = `
    import Component from "@glimmer/component";

    class Salutation extends Component {}

    interface SomeArg {
      name: string,
      id: number,
    }

    interface GreetingComponentSignature {
      Args: {
        someArg: SomeArg;
      }
    }

    export default class Greeting extends Component<GreetingComponentSignature> {
      static template = function() { return ''; };
    }
  `;

  beforeEach(() => {
    sourceFile = parse('something.ts', fixture);
    const someClassDeclaration = getClassByName(sourceFile, 'Greeting');

    if (!someClassDeclaration) {
      throw new Error('Test failure, unable to get classDeclaration node');
    }

    classDeclaration = someClassDeclaration;
  });

  test('getClassNameFromClassDeclaration', () => {
    const actual = getClassNameFromClassDeclaration(classDeclaration);
    expect(actual).toBe('Greeting');
  });

  test('getComponentSignatureInterfaceNode', () => {
    const maybeInterface = getComponentSignatureInterfaceNode(sourceFile, classDeclaration);
    expect(maybeInterface && isInterfaceDeclaration(maybeInterface)).toBe(true);
    expect(maybeInterface?.name.escapedText).toBe('GreetingComponentSignature');
  });

  test('getPropertyOnComponentSignatureInterface', () => {
    const fixture = `
    interface GreetingComponentSignature {
      Args: {
        someArg: string;
      }
    }
    `;
    const sourceFile = parse('something.ts', fixture);

    const interfaceNode = sourceFile.statements[0];

    expect.assertions(1);

    if (isInterfaceDeclaration(interfaceNode)) {
      const someNode = getPropertyOnComponentSignatureInterface(interfaceNode, 'Args');
      expect(someNode && (someNode?.name as ts.Identifier)?.escapedText === 'Args').toBeTruthy();
    }
  });

  test('getIdentifierForComponent', () => {
    const maybeIdentifier = getIdentifierForComponent(classDeclaration);

    expect.assertions(2);

    if (maybeIdentifier) {
      expect(isIdentifier(maybeIdentifier)).toBe(true);
      expect(maybeIdentifier.escapedText).toBe('Component');
    }
  });

  test('getJSDocExtendsTagWithSignature', () => {
    const fixture = `
      /**
       * @extends {Component<MyComponentSignature>}
       */
      export class MyComponent extends Component {
        name = "Bob";

        <template>
          <Repeat @phrase={{@age}} />
          <span>Hello, I am {{this.name}} and I am {{@age}} years old!</span>
          <span>My favorite snack is {{@snack}}.</span>
        </template>
      }
    `;
    const sourceFile = parse('something.ts', fixture);
    const classDeclaration = getClassByName(sourceFile, 'MyComponent');

    if (classDeclaration) {
      const someInterface = getJSDocExtendsTagWithSignature(classDeclaration);

      expect(someInterface).toEqual('MyComponentSignature');
    }
  });

  test('getNearestComponentClassDeclaration', () => {
    const targetNode = getClassByName(sourceFile, 'Greeting')?.members[0]; // Some node inside of the class.

    expect.assertions(2);
    if (targetNode) {
      const maybeComponentClass = getNearestComponentClassDeclaration(targetNode);
      if (maybeComponentClass) {
        expect(isClassDeclaration(maybeComponentClass)).toBe(true);
        expect(maybeComponentClass.name?.escapedText.toString()).toBe('Greeting');
      }
    }
  });

  test('getComponentSignatureName', () => {
    expect(getComponentSignatureName(classDeclaration)).toEqual('GreetingComponentSignature');
  });

  test('hasComponentSignature', () => {
    let classDeclaration: ts.ClassDeclaration | undefined;

    expect.assertions(2);

    classDeclaration = getClassByName(sourceFile, 'Greeting');

    if (classDeclaration) {
      expect(hasComponentSignature(classDeclaration)).toEqual(true);
    }

    classDeclaration = getClassByName(sourceFile, 'Salutation');

    if (classDeclaration) {
      expect(hasComponentSignature(classDeclaration)).toEqual(false);
    }
  });

  test('hasPropertyOnComponentSignatureInterface', () => {
    const fixture = `
    interface GreetingComponentSignature {
      Args: {
        someArg: string;
      }
    }
    `;
    const sourceFile = parse('something.ts', fixture);

    const interfaceNode = sourceFile.statements[0];

    expect.assertions(2);

    if (isInterfaceDeclaration(interfaceNode)) {
      expect(hasPropertyOnComponentSignatureInterface(interfaceNode, 'Args')).toBe(true);
      expect(hasPropertyOnComponentSignatureInterface(interfaceNode, 'Blocks')).toBe(false);
    }
  });
});
