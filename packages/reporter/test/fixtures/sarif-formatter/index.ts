import type { Report } from '../../../src/index.js';

export const initialData: Report = {
  summary: [{
    projectName: "@rehearsal/test",
    tsVersion: "4.7.4",
    timestamp: "9/16/2022, 20:16:50",
    basePath: "/reporter/test/sarif-formatter",
    commandName: "@rehearsal/reporter",
    entrypoint: "",
  }],
  items: [],
  fixedItemCount: 0
};

export const addRuleData: Report = {
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


export const addResultData: Report = {
  summary: [{
    projectName: "@rehearsal/test",
    tsVersion: "4.7.4",
    timestamp: "9/16/2022, 13:24:57",
    basePath: "/reporter/test/sarif-formatter",
    commandName: "@rehearsal/reporter",
    entrypoint: "",
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


export const addArtifactData: Report = {
  summary: [{
    projectName: "@rehearsal/test",
    tsVersion: "4.7.4",
    timestamp: "9/16/2022, 13:24:55",
    basePath: "/reporter/test/sarif-formatter",
    commandName: "@rehearsal/reporter",
    entrypoint: '',
  }],
  fixedItemCount: 5,
  items: [
    {
      analysisTarget: "add-artifact-2.ts",
      ruleId: "TS2790",
      category: "Error",
      type: 0,
      message: "The operand of a 'delete' operator must be optional.",
      hint: "The operand of a 'delete' operator must be optional.",
      nodeKind: "PropertyAccessExpression",
      nodeText: "teacher.yearsOfTeaching",
      nodeLocation: {
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 4,
      }
    },
    {
      analysisTarget: "add-artifact-2.ts",
      ruleId: "TS2345",
      category: "Error",
      type: 0,
      message: "Argument of type 'number' is not assignable to parameter of type 'string'.",
      hint: "Argument of type 'number' is not assignable to parameter of type 'string'. Consider verifying both types, using type assertion: '(4 as string)', or using type guard: 'if (4 instanceof string) { ... }'.",
      nodeKind: "FirstLiteralToken",
      nodeText: "4",
      nodeLocation: {
        startLine: 1,
        startColumn: 5,
        endLine: 1,
        endColumn: 8,
      }
    },
    {
      analysisTarget: "add-artifact-4.ts",
      ruleId: "TS2571",
      category: "Error",
      type: 0,
      message: "Object is of type 'unknown'.",
      hint: "Object is of type 'unknown'. Specify a type of variable, use type assertion: `(variable as DesiredType)` or type guard: `if (variable instanceof DesiredType) { ... }`",
      nodeKind: "Identifier",
      nodeText: "e",
      nodeLocation: {
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 4,
      }
    },
    {
      analysisTarget: "add-artifact-4.ts",
      ruleId: "TS2571",
      category: "Error",
      type: 0,
      message: "Object is of type 'unknown'.",
      hint: "Object is of type 'unknown'. Specify a type of variable, use type assertion: `(variable as DesiredType)` or type guard: `if (variable instanceof DesiredType) { ... }`",
      nodeKind: "Identifier",
      nodeText: "e",
      nodeLocation: {
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 3,
      }
    }
  ]
};
