import { describe, expect, test } from 'vitest';
import {
  findSingatureNameFromDefaultComponentExport,
  findTsInterfaceDeclarationByName,
  findPropertySignatureByName,
  findComponentSignatureBodyRange,
  parse,
} from '../src/fixes/glint/glint-parsing-utils.js';
import type { TsPropertySignature, TsTypeLiteral, Identifier } from '@swc/core';

describe('glint-parsing-utils', () => {
  test('findSingatureNameFromDefaultComponentExport', () => {
    const fixture = `export default class WithMissingArg extends Component<WithMissingArgComponentSignature> {}`;

    const parsed = parse(fixture);
    expect(findSingatureNameFromDefaultComponentExport(parsed.body)).toEqual(
      'WithMissingArgComponentSignature'
    );
  });

  test('findTsInterfaceDeclarationByName', () => {
    const fixture = `
    interface Something {}
    export interface ImplComponentSignature {}
    export interface Another {}
    `;

    let name = 'ImplComponentSignature';
    let found;

    const parsed = parse(fixture);
    found = findTsInterfaceDeclarationByName(parsed.body, 'ImplComponentSignature');
    expect(found?.id.value).toBe('ImplComponentSignature');

    name = 'Something';
    found = findTsInterfaceDeclarationByName(parsed.body, name);
    expect(found?.id.value).toBe(name);
  });

  test('findPropertySignatureByName', () => {
    const fixture = `
    interface SomeInterface {
      Args: {
        foo: string
      }
    }
    `;

    expect.assertions(3);

    const parsed = parse(fixture);
    const someInterface = findTsInterfaceDeclarationByName(parsed.body, 'SomeInterface');
    expect(someInterface).not.toBeUndefined();
    if (someInterface) {
      const someProperty = findPropertySignatureByName(someInterface, 'Args');
      const typeLiteral = someProperty?.typeAnnotation?.typeAnnotation as TsTypeLiteral;
      expect(typeLiteral.members[0].type).toBe('TsPropertySignature');
      const tsPropSig = typeLiteral.members[0] as TsPropertySignature;
      expect((tsPropSig.key as Identifier).value).toBe('foo');
    }
  });

  test('findComponentSignatureBodyRange', () => {
    const fixture = `
import Component from '@glimmer/component';

export interface WithMissingArgComponentSignature {
  Args: {}
}

export default class WithMissingArg extends Component<WithMissingArgComponentSignature> {
  name = 'Bob';
}
    `;
    const range = findComponentSignatureBodyRange(fixture);

    expect(range?.start).toBe(0);
    expect(range?.end).toBe(100);
  });
});
