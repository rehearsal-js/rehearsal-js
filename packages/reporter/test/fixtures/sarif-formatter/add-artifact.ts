import { type Report } from '../../../src';

const addArtifactData: Report = {
  summary: {
    projectName: "@rehearsal/test",
    tsVersion: "4.7.4",
    timestamp: "9/16/2022, 13:24:55",
    basePath: "/reporter/test/sarif-formatter",
    commandName: "@rehearsal/reporter"
  },
  items: [
    {
      analysisTarget: "add-artifact-2.ts",
      files: {
        ["add-artifact-2.ts"]: {
          fileName: "add-artifact-2.ts",
          location: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 20,
          },
          fixed: false,
          hint: '',
          code: '',
          codeFixAction: undefined,
          hintAdded: false,
          roles: [
            "analysisTarget",
            "unmodified"
          ]
        },
        ["add-artifact-1.ts"]: {
          fileName: "add-artifact-1.ts",
          location: {
            startLine: 1,
            startColumn: 5,
            endLine: 1,
            endColumn: 6,
          },
          hint: '',
          fixed: true,
          code: "?",
          codeFixAction: "add",
          hintAdded: false,
          roles: [
            "tracedFile",
            "modified"
          ]
        }
      },
      errorCode: 2790,
      category: "Error",
      message: "The operand of a 'delete' operator must be optional.",
      hint: "The operand of a 'delete' operator must be optional.",
      fixed: true,
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
      files: {
        ["add-artifact-2.ts"]: {
          fileName: "add-artifact-2.ts",
          location: {
            startLine: 1,
            startColumn: 5,
            endLine: 1,
            endColumn: 8,
          },
          fixed: false,
          code: '',
          codeFixAction: undefined,
          hint: "Argument of type 'number' is not assignable to parameter of type 'string'. Consider verifying both types, using type assertion: '(4 as string)', or using type guard: 'if (4 instanceof string) { ... }'.",
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
      hint: "Argument of type 'number' is not assignable to parameter of type 'string'. Consider verifying both types, using type assertion: '(4 as string)', or using type guard: 'if (4 instanceof string) { ... }'.",
      fixed: false,
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
      files: {
        ["add-artifact-4.ts"]: {
          fileName: "add-artifact-4.ts",
          location: {
            startLine: 1,
            startColumn: 5,
            endLine: 1,
            endColumn: 8,
          },
          fixed: true,
          hintAdded: false,
          code: '',
          codeFixAction: undefined,
          hint: '',
          roles: [
            "analysisTarget",
            "modified"
          ]
        }
      },
      errorCode: 2571,
      category: "Error",
      message: "Object is of type 'unknown'.",
      hint: "Object is of type 'unknown'. Specify a type of variable, use type assertion: `(variable as DesiredType)` or type guard: `if (variable instanceof DesiredType) { ... }`",
      fixed: true,
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
      files: {
        ["add-artifact-4.ts"]: {
          fileName: "add-artifact-4.ts",
          location: {
            startLine: 1,
            startColumn: 4,
            endLine: 1,
            endColumn: 7,
          },
          fixed: true,
          hintAdded: false,
          hint: '',
          code: '',
          codeFixAction: undefined,
          roles: [
            "analysisTarget",
            "modified"
          ]
        }
      },
      errorCode: 2571,
      category: "Error",
      message: "Object is of type 'unknown'.",
      hint: "Object is of type 'unknown'. Specify a type of variable, use type assertion: `(variable as DesiredType)` or type guard: `if (variable instanceof DesiredType) { ... }`",
      fixed: true,
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
export { addArtifactData };
