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
      errorCode: 2790,
      category: "Error",
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
      errorCode: 2345,
      category: "Error",
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
      errorCode: 2571,
      category: "Error",
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
      errorCode: 2571,
      category: "Error",
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
export { addArtifactData };
