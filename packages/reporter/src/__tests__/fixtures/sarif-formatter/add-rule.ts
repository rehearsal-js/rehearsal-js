import { type Report } from '../../../types';

const addRuleData: Report = {
  summary: {
    projectName: "@rehearsal/test",
    tsVersion: "4.7.4",
    timestamp: "9/16/2022, 13:24:52",
    basePath: "/reporter/test/sarif-formatter",
    commandName: "@rehearsal/reporter"
  },
  items: [
    {
      analysisTarget: "add-rule-1.ts",
      files: {
        ["add-rule-1.ts"]: {
          fileName: "add-rule-1.ts",
          location: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 1,
          },
          fixed: true,
          oldCode: "import { resolve } from 'path';",
          newCode: '',
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
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 10,
      }
    },
    {
      analysisTarget: "add-rule-1.ts",
      files: {
        ["add-rule-1.ts"]: {
          fileName: "add-rule-1.ts",
          location: {
            startLine: 3,
            startColumn: 1,
            endLine: 3,
            endColumn: 2,
          },
          fixed: false,
          oldCode: '',
          newCode: '',
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
        endLine: 2,
        endColumn: 2,
      }
    },
    {
      analysisTarget: "add-rule-2.ts",
      files: {
        ["add-rule-2.ts"]: {
          fileName: "add-rule-2.ts",
          location: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 5,
          },
          fixed: false,
          oldCode: '',
          newCode: '',
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
        startLine: 3,
        startColumn: 1,
        endLine: 1,
        endColumn: 5,
      }
    }
  ]
};

export { addRuleData };
