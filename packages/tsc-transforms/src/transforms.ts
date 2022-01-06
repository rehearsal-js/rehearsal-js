/* eslint-disable @typescript-eslint/no-explicit-any */
import type { types } from "recast";
import type { NodePath } from "ast-types/lib/node-path";

// NodePath<Comment> should have node.leadingComments
interface NodePathComment extends NodePath<types.namedTypes.Comment, any> {
  node: any;
}

// TODO remove this trivial example once we start writting transforms
export function tsMigrateComments(astPath: NodePathComment): NodePathComment {
  const associatedNode = astPath.node;
  const commentNode = astPath.value;
  const comment = commentNode.value;
  const newCommentValue = comment.replace("FIXME", "FIXED");

  associatedNode.leadingComments[0].value = newCommentValue;
  commentNode.value = newCommentValue;

  return astPath;
}
