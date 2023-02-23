import { getTypeNameFromVariable, isVariableOfCatchClause } from '@rehearsal/utils';
import { isFunctionDeclaration, isIdentifier, isParameter, isReturnStatement } from 'typescript';

import { HintsProvider } from './hints-provider.js';

export const hints = new HintsProvider({
  2322: {
    hint: `Type '{0}' is being returned or assigned, but type '{1}' is expected. Please convert type '{0}' to type '{1}', or return or assign a variable of type '{1}'`,
    helpUrl:
      'https://stackoverflow.com/questions/72139358/ts2322-type-typeof-statusenum-is-not-assignable-to-type-statusenum',
    hints: [
      {
        when: (n) => isReturnStatement(n),
        hint: `The function expects to return '{1}', but '{0}' is returned. Please convert '{0}' value to '{1}' or update the function's return type.`,
      },
      {
        when: (n) => isIdentifier(n),
        hint: `The variable '{node.text}' has type '{1}', but '{0}' is assigned. Please convert '{0}' to '{1}' or change variable's type.`,
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
    helpUrl:
      'https://stackoverflow.com/questions/42421501/error-ts2345-argument-of-type-t-is-not-assignable-to-parameter-of-type-objec',
  },
  2571: {
    helpUrl:
      'https://stackoverflow.com/questions/65603803/typescript-object-is-of-type-unknown-ts2571',
    hint: `Object is of type '{0}'. Specify a type of variable, use type assertion: \`(variable as DesiredType)\` or type guard: \`if (variable instanceof DesiredType) { ... }\``,
    hints: [
      {
        when: (n) => !isIdentifier(n) || !isVariableOfCatchClause(n),
        hint: `Object is of type '{0}'. Specify a type of {node.text}, use type assertion: \`({node.text} as DesiredType)\` or type guard: \`if ({node.text} instanceof DesiredType) { ... }\``,
      },
    ],
  },
  2790: {
    hint: `The operand of a 'delete' operator must be optional.`,
    helpUrl:
      'https://stackoverflow.com/questions/67266323/the-operand-of-a-delete-operator-must-be-optional-ts2790-while-creating-a-fo',
  },
  4082: {
    hint: `Default export of the module has or is using private name {0}.`,
    helpUrl: 'https://github.com/microsoft/TypeScript/issues/6307',
  },
  6133: {
    hint: `The declaration '{0}' is never read or used. Remove the declaration or use it.`,
    helpUrl: 'https://stackoverflow.com/search?tab=votes&q=TS6133',
    hints: [
      {
        when: (n) => isIdentifier(n) && isFunctionDeclaration(n.parent),
        hint: `The function '{0}' is never called. Remove the function or use it.`,
      },
      {
        when: (n) => isIdentifier(n) && isParameter(n.parent),
        hint: `The parameter '{0}' is never used. Remove the parameter from function definition or use it.`,
      },
      {
        when: (n) => isIdentifier(n),
        hint: `The variable '{0}' is never read or used. Remove the variable or use it.`,
      },
    ],
  },
  7006: {
    hint: `Parameter '{0}' implicitly has an '{1}' type.`,
    helpUrl:
      'https://stackoverflow.com/questions/43064221/typescript-ts7006-parameter-xxx-implicitly-has-an-any-type',
  },
});
