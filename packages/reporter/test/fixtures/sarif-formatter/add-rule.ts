import { type Report } from '../../../src';

const addRuleData: Report = {
  summary: [{
    projectName: "@rehearsal/test",
    tsVersion: "4.7.4",
    timestamp: "9/16/2022, 13:24:52",
    basePath: "/reporter/test/sarif-formatter",
    commandName: "@rehearsal/reporter",
    entrypoint: "",
  }],
  fixedItemCount: 5,
  items: [
    {
      analysisTarget: "add-rule-1.ts",
      ruleId: "TS6133",
      type: 0,
      category: "Error",
      message: "'resolve' is declared but its value is never read.",
      hint: "The declaration 'resolve' is never read or used. Remove the declaration or use it.",
      nodeKind: "ImportDeclaration",
      nodeText: "import { resolve } from 'path';",
      nodeLocation: {
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 10,
      }
    },
    {
      analysisTarget: "add-rule-1.ts",
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
        endLine: 2,
        endColumn: 2,
      }
    },
    {
      analysisTarget: "add-rule-2.ts",
      ruleId: "TS2345",
      category: "Error",
      type: 0,
      message: "Argument of type 'number' is not assignable to parameter of type 'string'.",
      hint: "Argument of type 'number' is not assignable to parameter of type 'string'. Consider verifying both types, using type assertion: '(6 as string)', or using type guard: 'if (6 instanceof string) { ... }'.",
      nodeKind: "FirstLiteralToken",
      nodeText: "6",
      nodeLocation: {
        startLine: 3,
        startColumn: 1,
        endLine: 1,
        endColumn: 5,
      }
    },
    {
      analysisTarget: "add-rule-2.ts",
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

export { addRuleData };
