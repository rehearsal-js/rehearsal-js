import type { TransformResponse, NodePathComment } from "./diagnostic_autofix";

// TODO remove this trivial example once we start writting transforms
export function tsMigrateComments(astPath: NodePathComment): TransformResponse {
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
