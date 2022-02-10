import {
  DiagnosticAutofix,
  NodePathComment,
  TransformResponse,
} from "../diagnostic_autofix";
import { tsMigrateComments } from "../transforms";

const Autofix2322 = new DiagnosticAutofix(
  2322,
  "Try running `yarn add '{0}'.`",
  `error`,
  (astPath: NodePathComment): TransformResponse => {
    return tsMigrateComments(astPath);
  }
);

export default Autofix2322;
