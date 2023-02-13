import { type Report } from '../../../src';

const addResultData: Report = {
  summary: [{
    projectName: "@rehearsal/test",
    tsVersion: "4.7.4",
    timestamp: "9/16/2022, 13:24:57",
    basePath: "/reporter/test/sarif-formatter",
    commandName: "@rehearsal/reporter"
  }],
  fixedItemCount: 3,
  items: [
    {
      analysisTarget: "add-result-1.ts",
      ruleId: "TS6133",
      category: "Error",
      type: 0,
      message: "'react' is declared but its value is never read.",
      hint: "The declaration 'react' is never read or used. Remove the declaration or use it.",
      nodeKind: "ImportDeclaration",
      nodeText: "import react from 'react';",
      nodeLocation: {
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 20,
      }
    },
    {
      analysisTarget: "add-result-1.ts",
      ruleId: "TS2322",
      category: "Error",
      type: 0,
      message: "Type 'string' is not assignable to type 'number'.",
      hint: "The variable 'a' has type 'number', but 'string' is assigned. Please convert 'string' to 'number' or change variable's type.",
      nodeKind: "Identifier",
      nodeText: "a",
      nodeLocation: {
        startLine: 3,
        startColumn: 1,
        endLine: 1,
        endColumn: 5,
      }
    },
    {
      analysisTarget: "add-result-1.ts",
      ruleId: "TS2345",
      category: "Error",
      type: 0,
      message: "Argument of type '{}' is not assignable to parameter of type 'string'.",
      hint: "Argument of type '{0}' is not assignable to parameter of type 'string'. Consider verifying both types, using type assertion: '({} as string)', or using type guard: 'if ({} instanceof string) { ... }'.",
      nodeKind: "ObjectLiteralExpression",
      nodeText: "{}",
      nodeLocation: {
        startLine: 3,
        startColumn: 10,
        endLine: 10,
        endColumn: 5,
      }
    },
    {
      analysisTarget: "add-rule-5.ts",
      ruleId: "@typescript-eslint/no-explicit-any",
      category: "Error",
      type: 1,
      message: "Unexpected any. Specify a different type.",
      hint: "Unexpected any. Specify a different type.",
      nodeKind: "TSAnyKeyword",
      nodeText: "",
      nodeLocation: {
        startLine: 7,
        startColumn: 1,
        endLine: 4,
        endColumn: 7,
      }
    }
  ]
};

export { addResultData };
