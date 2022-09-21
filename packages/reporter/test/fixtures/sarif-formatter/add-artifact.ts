import { type Report } from '../../../src';

const addArtifactData: Report = {
  summary: {
    projectName: "@rehearsal/test",
    tsVersion: "4.7.4",
    timestamp: "9/16/2022, 13:24:55",
    basePath: "/reporter/test/sarif-formatter"
  },
  items: [
    {
      analysisTarget: "add-artifact-2.ts",
      files: {
        ["add-artifact-2.ts"]: {
          fileName: "add-artifact-2.ts",
          location: {
            line: 8,
            character: 8
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
            line: 3,
            character: 18
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
        start: 143,
        length: 23,
        line: 7,
        character: 7
      }
    },
    {
      analysisTarget: "add-artifact-2.ts",
      files: {
        ["add-artifact-2.ts"]: {
          fileName: "add-artifact-2.ts",
          location: {
            line: 14,
            character: 18
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
        start: 275,
        length: 1,
        line: 13,
        character: 17
      }
    },
    {
      analysisTarget: "add-artifact-4.ts",
      files: {
        ["add-artifact-4.ts"]: {
          fileName: "add-artifact-4.ts",
          location: {
            line: 4,
            character: 15
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
        start: 57,
        length: 1,
        line: 3,
        character: 14
      }
    },
    {
      analysisTarget: "add-artifact-4.ts",
      files: {
        ["add-artifact-4.ts"]: {
          fileName: "add-artifact-4.ts",
          location: {
            line: 6,
            character: 17
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
        start: 100,
        length: 1,
        line: 5,
        character: 16
      }
    }
  ]
};
export { addArtifactData };