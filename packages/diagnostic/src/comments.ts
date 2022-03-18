import ts from 'typescript';

export interface Comment {
  text: string;
  kind: ts.CommentKind;
  hasTrailingNewLine: boolean;
}

enum CommentRangeKind {
  Leading = 0,
  Trailing = 1,
}

export function getLeadingComments(node: ts.Node): Comment[] {
  return getComments(node, CommentRangeKind.Leading);
}

export function getTrailingComments(node: ts.Node): Comment[] {
  return getComments(node, CommentRangeKind.Trailing);
}

export function setLeadingComments(node: ts.Node, comment: Comment[]): boolean {
  return setComments(node, CommentRangeKind.Leading, comment);
}

export function setTrailingComments(node: ts.Node, comment: Comment[]): boolean {
  return setComments(node, CommentRangeKind.Trailing, comment);
}

export function setComments(node: ts.Node, kind: CommentRangeKind, comments: Comment[]): boolean {
  const addSyntheticComment =
    kind === CommentRangeKind.Leading
      ? ts.addSyntheticLeadingComment
      : ts.addSyntheticTrailingComment;

  comments.forEach((comment) => {
    addSyntheticComment(node, comment.kind, comment.text, comment.hasTrailingNewLine);
  });

  return true;
}

function getComments(node: ts.Node, kind: CommentRangeKind): Comment[] {
  const getCommentRanges =
    kind === CommentRangeKind.Leading ? ts.getLeadingCommentRanges : ts.getTrailingCommentRanges;

  const sourceText = node.getSourceFile().getFullText();

  const commentRanges = getCommentRanges(sourceText, node.getFullStart());

  if (commentRanges === undefined || commentRanges.length === 0) {
    return [];
  }

  const comments: Comment[] = [];

  commentRanges.forEach((commentRange) => {
    const text =
      commentRange.kind === ts.SyntaxKind.MultiLineCommentTrivia
        ? sourceText.slice(commentRange.pos + 2, commentRange.end - 2) // trim `/*` and `*/`
        : sourceText.slice(commentRange.pos + 2, commentRange.end); // trim `//`

    comments.push({
      text: text,
      kind: commentRange.kind,
      hasTrailingNewLine: !!commentRange.hasTrailingNewLine,
    });
  });

  return comments;
}
