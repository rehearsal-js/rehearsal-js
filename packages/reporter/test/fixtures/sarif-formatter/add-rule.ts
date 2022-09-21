import { type Report } from '../../../src';

const addRuleData: Report = {
  summary: {
    projectName: "@rehearsal/test",
    tsVersion: "4.7.4",
    timestamp: "9/16/2022, 13:24:52",
    basePath: "/reporter/test/sarif-formatter"
  },
  items: [
    {
      analysisTarget: "add-rule-1.ts",
      files: {
        ["add-rule-1.ts"]: {
          fileName: "add-rule-1.ts",
          location: {
          line: 1,
          character: 1
          },
          fixed: true,
          code: "import { resolve } from 'path';",
          codeFixAction: "delete",
          hint: '',
          hintAdded: false,
          roles: [
            "analysisTarget",
            "modified"
          ]
        }
      },
      errorCode: 6133,
      category: "Error",
      message: "'resolve' is declared but its value is never read.",
      hint: "The declaration 'resolve' is never read or used. Remove the declaration or use it.",
      fixed: true,
      nodeKind: "ImportDeclaration",
      nodeText: "import { resolve } from 'path';",
      nodeLocation: {
        start: 0,
        length: 31,
        line: 0,
        character: 0
      }
    },
    {
      analysisTarget: "add-rule-1.ts",
      files: {
        ["add-rule-1.ts"]: {
          fileName: "add-rule-1.ts",
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
      analysisTarget: "add-rule-2.ts",
      files: {
        ["add-rule-2.ts"]: {
          fileName: "add-rule-2.ts",
          location: {
            line: 5,
            character: 13
          },
          fixed: false,
          code: '',
          codeFixAction: undefined,
          hint: "Argument of type 'number' is not assignable to parameter of type 'string'. Consider verifying both types, using type assertion: '(6 as string)', or using type guard: 'if (6 instanceof string) { ... }'.",
          hintAdded: true,
          roles: [
            "analysisTarget",
            "unmodified"
          ]
        }
      },
      errorCode: 2345,
      category: "Error",
      message: "Argument of type 'number' is not assignable to parameter of type 'string'.",
      hint: "Argument of type 'number' is not assignable to parameter of type 'string'. Consider verifying both types, using type assertion: '(6 as string)', or using type guard: 'if (6 instanceof string) { ... }'.",
      fixed: false,
      nodeKind: "FirstLiteralToken",
      nodeText: "6",
      nodeLocation: {
        start: 81,
        length: 1,
        line: 4,
        character: 12
      }
    }
  ]
};

export { addRuleData };