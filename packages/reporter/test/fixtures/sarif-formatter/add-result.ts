import { type Report } from '../../../src';

const addResultData: Report = {
  summary: {
    projectName: "@rehearsal/test",
    tsVersion: "4.7.4",
    timestamp: "9/16/2022, 13:24:57",
    basePath: "/reporter/test/sarif-formatter",
    commandName: "@rehearsal/reporter"
  },
  items: [
    {
      analysisTarget: "add-result-1.ts",
      files: {
        ["add-result-1.ts"]: {
          fileName: "add-result-1.ts",
          location: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 1,
          },
          fixed: true,
          hint: '',
          oldCode: "import react from 'react';",
          newCode: '',
          codeFixAction: "delete",
          hintAdded: false,
          roles: [
            "analysisTarget",
            "modified"
          ]
        }
      },
      errorCode: 6133,
      category: "Error",
      message: "'react' is declared but its value is never read.",
      hint: "The declaration 'react' is never read or used. Remove the declaration or use it.",
      fixed: true,
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
      files: {
        ["add-result-1.ts"]: {
          fileName: "add-result-1.ts",
          location: {
            startLine: 3,
            startColumn: 1,
            endLine: 1,
            endColumn: 5,
          },
          fixed: false,
          oldCode: undefined,
          newCode: undefined,
          codeFixAction: undefined,
          hint: "The variable 'a' has type 'number', but 'string' is assigned. Please convert 'string' to 'number' or change variable's type.",
          hintAdded: true,
          roles: [
            "analysisTarget",
            "unmodified"
          ]
        }
      },
      errorCode: 2322,
      category: "Error",
      message: "Type 'string' is not assignable to type 'number'.",
      hint: "The variable 'a' has type 'number', but 'string' is assigned. Please convert 'string' to 'number' or change variable's type.",
      fixed: false,
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
      files: {
        ["add-result-1.ts"]: {
          fileName: "add-result-1.ts",
          location: {
            startLine: 10,
            startColumn: 1,
            endLine: 10,
            endColumn: 5,
          },
          fixed: false,
          oldCode: undefined,
          newCode: undefined,
          codeFixAction: undefined,
          hint: "Argument of type '{0}' is not assignable to parameter of type 'string'. Consider verifying both types, using type assertion: '({} as string)', or using type guard: 'if ({} instanceof string) { ... }'.",
          hintAdded: true,
          roles: [
            "analysisTarget",
            "unmodified"
          ]
        }
      },
      errorCode: 2345,
      category: "Error",
      message: "Argument of type '{}' is not assignable to parameter of type 'string'.",
      hint: "Argument of type '{0}' is not assignable to parameter of type 'string'. Consider verifying both types, using type assertion: '({} as string)', or using type guard: 'if ({} instanceof string) { ... }'.",
      fixed: false,
      nodeKind: "ObjectLiteralExpression",
      nodeText: "{}",
      nodeLocation: {
        startLine: 3,
        startColumn: 10,
        endLine: 10,
        endColumn: 5,
      }
    }
  ]
};

export { addResultData };
