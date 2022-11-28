import { BaseCodeFixCollection } from './base-codefix-collection';
import { CodeFixesProvider } from './codefixes-provider';
import { TypescriptCodeFixCollection } from './typescript-codefix-collection';

import { FixTransform2571 } from './2571';
import { FixTransform2790 } from './2790';
import { FixTransform4082 } from './4082';

export const codefixes = new CodeFixesProvider([
  new BaseCodeFixCollection({
    2571: new FixTransform2571(),
    2790: new FixTransform2790(),
    4082: new FixTransform4082(),
  }),
  new TypescriptCodeFixCollection(),
]);
