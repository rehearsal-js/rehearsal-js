import { DiagnosticAutofix } from './diagnostic_autofix';

import Autofix2307 from './transforms/2307';
import Autofix2322 from './transforms/2322';
import Autofix2345 from './transforms/2345';
import Autofix6133 from './transforms/6133';

const DIAGNOSTIC_AUTOFIX: { [key: string]: DiagnosticAutofix } = {
  '2307': Autofix2307,
  '2322': Autofix2322,
  '2345': Autofix2345,
  '6133': Autofix6133,
};

export default DIAGNOSTIC_AUTOFIX;
