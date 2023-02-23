import {
  FileTextChanges,
  getLineAndCharacterOfPosition,
  getPositionOfLineAndCharacter,
  Node,
  SourceFile,
} from 'typescript';

import { isNodeInsideJsx } from './index.js';

/**
 * Collection of functions that produces FileTextChanges for different cases
 * @see inspired by ChangeTracker from textChanges.js of TypeScript internals
 */
export class ChangesFactory {
  static replaceText(
    sourceFile: SourceFile,
    start: number,
    length: number,
    newText: string
  ): FileTextChanges {
    return {
      fileName: sourceFile.fileName,
      textChanges: [{ newText, span: { start, length } }],
    };
  }

  static insertText(sourceFile: SourceFile, start: number, newText: string): FileTextChanges {
    return this.replaceText(sourceFile, start, 0, newText);
  }

  static deleteText(sourceFile: SourceFile, start: number, length: number): FileTextChanges {
    return this.replaceText(sourceFile, start, length, '');
  }

  static replaceNode(sourceFile: SourceFile, oldNode: Node, newNode: Node): FileTextChanges {
    return this.replaceText(
      sourceFile,
      oldNode.getFullStart(), // TODO Check getAdjustedStartPosition
      oldNode.getFullWidth(),
      newNode.getFullText()
    );
  }

  static insertNode(sourceFile: SourceFile, start: number, newNode: Node): FileTextChanges {
    return this.insertText(sourceFile, start, newNode.getText());
  }

  static deleteNode(sourceFile: SourceFile, oldNode: Node): FileTextChanges {
    return this.deleteText(sourceFile, oldNode.getFullStart(), oldNode.getFullWidth());
  }

  static insertCommentAtLineBeforeNode(
    sourceFile: SourceFile,
    node: Node,
    commentText: string
  ): FileTextChanges {
    // Search for a position to add comment - the first element at the line with affected node
    const line = getLineAndCharacterOfPosition(sourceFile, node.getStart()).line;
    const positionToAddComment = getPositionOfLineAndCharacter(sourceFile, line, 0);
    const comment = isNodeInsideJsx(node) ? `{/* ${commentText} */}` : `/* ${commentText} */`;

    return this.insertText(sourceFile, positionToAddComment, comment + '\n');
  }
}
