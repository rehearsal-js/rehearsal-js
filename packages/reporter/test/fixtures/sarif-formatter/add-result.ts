import { type Report } from '../../../src';

const addResultData: Report = {
  summary: {
    projectName: "@rehearsal/test",
    tsVersion: "4.7.4",
    timestamp: "9/16/2022, 13:24:57",
    basePath: "/reporter/test/sarif-formatter"
  },
  items: [
    {
      analysisTarget: "add-result-1.ts",
      files: {
        ["add-result-1.ts"]: {
          fileName: "add-result-1.ts",
          location: {
            "line": 1,
            "character": 1
          },
          fixed: true,
          hint: '',
          code: "import react from 'react';",
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
        start: 0,
        length: 26,
        line: 0,
        character: 0
      }
    },
    {
      analysisTarget: "add-result-1.ts",
      files: {
        ["add-result-1.ts"]: {
          fileName: "add-result-1.ts",
          location: {
            line: 2,
            character: 7
          },
          fixed: false,
          code: '',
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
        start: 15,
        length: 1,
        line: 1,
        character: 6
      }
    },
    {
      analysisTarget: "add-result-1.ts",
      files: {
        ["add-result-1.ts"]: {
          fileName: "add-result-1.ts",
          location: {
            line: 9,
            character: 6
          },
          fixed: false,
          code: '',
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
        start: 283,
        length: 2,
        line: 8,
        character: 5
      }
    }
  ]
};

export { addResultData };