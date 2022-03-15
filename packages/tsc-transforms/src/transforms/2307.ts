import { DiagnosticAutofix, NodePathComment, TransformResponse } from '../diagnostic_autofix';
import { tsMigrateComments } from '../transforms';

const Autofix2307 = new DiagnosticAutofix(
  2307,
  "Try running `yarn add '{0}'.`",
  `error`,
  (astPath: NodePathComment): TransformResponse => {
    return tsMigrateComments(astPath);
  }
);

export default Autofix2307;
