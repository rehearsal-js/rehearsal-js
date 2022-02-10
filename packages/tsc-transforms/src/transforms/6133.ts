import {
  DiagnosticAutofix,
  NodePathComment,
  TransformResponse,
} from "../diagnostic_autofix";

export const Autofix6133 = new DiagnosticAutofix(
  6133,
  `The declaration '{0}' is never read. Remove the declaration or use it.`,
  `error`,
  (astPath: NodePathComment): TransformResponse => {
    const associatedNode = astPath.node;
    const commentNode = astPath.value;
    const comment = commentNode.value;
    const newCommentValue = comment.replace("FIXME", "FIXED");

    associatedNode.leadingComments[0].value = newCommentValue;
    commentNode.value = newCommentValue;

    return {
      path: astPath,
      isSuccess: true,
    };
  }
);

export default Autofix6133;
