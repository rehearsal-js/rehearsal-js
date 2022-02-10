import * as recast from 'recast';
import { assert } from 'chai';
import { describe } from 'mocha';
import { readdirSync } from 'fs';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

import type { types } from "recast";

import { diagnosticAutofix, NodePathComment } from '../src';

const tests = getTests();

describe('Test transforms', function() {
  tests.forEach((transformCode) => {
    it(`Autofix for TS${transformCode} code`, async () => {

      const inputContent = await readTestFileContent(transformCode, 'input.tts');

      const ast: types.ASTNode = recast.parse(inputContent, {
        parser: require("recast/parsers/typescript"),
      });

      recast.visit(ast, {
        visitComment(astPath: NodePathComment) {
          if (astPath.value.value.includes("ts-migrate")) {

            diagnosticAutofix[transformCode].transform(astPath);

            //console.log(diagnosticAutofix[transformCode]);

            //console.log(resolve("../src/transforms", transformCode));
            //import("../src/transforms/6133").then((transform) => {
            //  transform.default.transform(astPath);
            //  this.traverse(astPath);
            //});

            //transform.default.transform(astPath);


            this.traverse(astPath);
          }
        }
      });

      const transformedContent = recast.print(ast).code;

      const expectedContent = await readTestFileContent(transformCode, 'output.tts');

      assert.equal(transformedContent, expectedContent, `Transform ${transformCode}`);
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