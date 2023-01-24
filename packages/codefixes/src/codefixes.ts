import { BaseCodeFixCollection } from './base-codefix-collection';
import { CodeFixesProvider } from './codefixes-provider';
import { TypescriptCodeFixCollection } from './typescript-codefix-collection';

import { Fix2571 } from './fixes/2571';
import { Fix2790 } from './fixes/2790';
import { Fix4082 } from './fixes/4082';

export const codefixes = new CodeFixesProvider([
  new BaseCodeFixCollection({
    2571: new Fix2571(),
    2790: new Fix2790(),
    4082: new Fix4082(),
  }),
  new TypescriptCodeFixCollection(),
]);
