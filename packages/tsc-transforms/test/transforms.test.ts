import * as recast from 'recast';
import { assert } from 'chai';
import { describe } from 'mocha';
import { readdirSync } from 'fs';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

import type { types } from "recast";

import { diagnosticAutofix, NodePathComment } from '../src';

const tests = getTests();

describe('transforms matrix', function() {
  tests.forEach((transformCode) => {
    it(`Autofix for TS${transformCode} code`, async () => {

      // fixture input source file
      const inputSource = await readTestFileContent(transformCode, 'input.tts');

      // run the transform for the given diagnostic code
      const ast: types.ASTNode = recast.parse(inputSource, {
        parser: require("recast/parsers/typescript"),
      });
      recast.visit(ast, {
        visitComment(astPath: NodePathComment) {
          if (astPath.value.value.includes("ts-migrate")) {
            diagnosticAutofix[transformCode].transform(astPath);
            this.traverse(astPath);
          }
        }
      });

      // transformed fixture input source file
      const transformedSource = recast.print(ast).code;

      // fixture output source file
      const expectedSourceOutput = await readTestFileContent(transformCode, 'output.tts');

      assert.equal(transformedSource, expectedSourceOutput, `Transform ${transformCode}`);
    });
  });
});

async function readTestFileContent(transformCode: string, fileName: string): Promise<string> {
  const file = resolve(__dirname, "./transforms", transformCode, fileName);

  return await readFile(file, 'utf-8');
}

function getTests(): string[] {
  const sourcePath = resolve(__dirname, "./transforms");

  return readdirSync(sourcePath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
}