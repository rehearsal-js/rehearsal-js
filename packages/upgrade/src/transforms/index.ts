import ts from 'typescript';
import { getTypeNameFromVariable, isVariableOfCatchClause } from '@rehearsal/utils';

import { CodeFixCollection } from './codefix-collection';

import { FixTransform2571 } from './2571';
import { FixTransform2790 } from './2790';
import { FixTransform4082 } from './4082';
import { FixTransform6133 } from './6133';

export const codefixes = new CodeFixCollection({
  2322: {
    hint: `Type '{0}' is being returned or assigned, but type '{1}' is expected. Please convert type '{0}' to type '{1}', or return or assign a variable of type '{1}'`,
    helpUrl: '...',
    hints: [
      {
        when: (n) => ts.isReturnStatement(n),
        hint: `The function expects to return '{1}', but '{0}' is returned. Please convert '{0}' value to '{1}' or update the function's return type.`,
      },
      {
        when: (n) => ts.isIdentifier(n),
        hint: `The variable '{node.escapedText}' has type '{1}', but '{0}' is assigned. Please convert '{0}' to '{1}' or change variable's type.`,
      },
    ],
  },
  2345: {
    hint: `Argument of type '{0}' is not assignable to parameter of type '{1}'.`,
    hints: [
      {
        when: (n, _, c) => getTypeNameFromVariable(n, c) === 'unknown',
        hint: `Argument of type '{0}' is not assignable to parameter of type '{1}'. Consider specifying type of argument to be '{1}', using type assertion: '({node.fullText} as {1})', or using type guard: 'if ({node.fullText} instanceof {1}) { ... }'.`,
      },
      {
        when: (n, _, c) => getTypeNameFromVariable(n, c) !== 'unknown',
        hint: `Argument of type '{0}' is not assignable to parameter of type '{1}'. Consider verifying both types, using type assertion: '({node.fullText} as string)', or using type guard: 'if ({node.fullText} instanceof string) { ... }'.`,
      },
    ],
  },
  2571: {
    codefix: new FixTransform2571(),
    hint: `Object is of type '{0}'. Specify a type of variable, use type assertion: \`(variable as DesiredType)\` or type guard: \`if (variable instanceof DesiredType) { ... }\``,
    hints: [
      {
        when: (n) => !ts.isIdentifier(n) || !isVariableOfCatchClause(n),
        hint: `Object is of type '{0}'. Specify a type of {node.text}, use type assertion: \`({node.text} as DesiredType)\` or type guard: \`if ({node.text} instanceof DesiredType) { ... }\``,
      },
    ],
  },
  2790: {
    codefix: new FixTransform2790(),
    hint: `The operand of a 'delete' operator must be optional.`,
  },
  4082: {
    codefix: new FixTransform4082(),
    hint: `Default export of the module has or is using private name {0}.`,
  },
  6133: {
    codefix: new FixTransform6133(),
    hint: `The declaration '{0}' is never read or used. Remove the declaration or use it.`,
    helpUrl: 'https://stackoverflow.com/search?tab=votes&q=TS6133',
    hints: [
      {
        when: (n) => ts.isIdentifier(n) && ts.isFunctionDeclaration(n.parent),
        hint: `The function '{0}' is never called. Remove the function or use it.`,
      },
      {
        when: (n) => ts.isIdentifier(n) && ts.isParameter(n.parent),
        hint: `The parameter '{0}' is never used. Remove the parameter from function definition or use it.`,
      },
      {
        when: (n) => ts.isIdentifier(n),
        hint: `The variable '{0}' is never read or used. Remove the variable or use it.`,
      },
    ],
  },
});
