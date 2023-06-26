import { extname } from 'node:path';
import { CodeFixAction } from 'typescript';
import { GlintService } from '@rehearsal/service';
import { ChangesFactory } from '@rehearsal/ts-utils';
import { Diagnostics } from '../../diagnosticInformationMap.generated.js';
import { createCodeFixAction } from '../../hints-codefix-collection.js';
import { findComponentSignatureBodyRange } from './glint-parsing-utils.js';
import type { CodeFix, DiagnosticWithContext } from '../../types.js';

interface GlintDiagnosticWithContext extends DiagnosticWithContext {
  glintService: GlintService;
}

export class AddMissingArgToComponentSignature implements CodeFix {
  getErrorCodes = (): number[] => [Diagnostics.TS2339.code];

  getCodeAction(diagnostic: DiagnosticWithContext): CodeFixAction | undefined {
    const d = diagnostic as GlintDiagnosticWithContext;
    const glintService = d.glintService;

    // Only support .gts files and not .hbs
    if (extname(d.file.fileName) == '.hbs') {
      return;
    }
    const fileName = d.file.fileName;
    const originalStart = d.start;
    const originalEnd = originalStart + d.length;

    const transformedRange = glintService.transformManager.getTransformedRange(
      fileName,
      originalStart,
      originalEnd
    );

    // Check the parent to see if this is an arg
    const parentSourceNode = transformedRange?.mapping?.parent?.sourceNode;

    if (!parentSourceNode) {
      return;
    }

    // Determine if this is an argument
    let isPathExpressionAnArgument = false;

    if (parentSourceNode.type === 'PathExpression') {
      // Unable to easily cast to a type, this is a hack for now.
      isPathExpressionAnArgument = (parentSourceNode as { original: string }).original.startsWith(
        '@'
      );
    }

    if (!isPathExpressionAnArgument) {
      return;
    }

    // We may be able to get this from the diagnostic
    const argName =
      transformedRange?.mapping?.sourceNode.type == 'Identifier'
        ? transformedRange?.mapping?.sourceNode.name
        : null;

    const transformedContent = glintService.transformManager.readTransformedFile(fileName);

    if (!transformedContent) {
      return;
    }

    // get the range for the interior of the ComponentSignature Args object.
    const argsRange = findComponentSignatureBodyRange(transformedContent);

    if (!argsRange) {
      return;
    }

    const originalSignatureRange = glintService.transformManager.getOriginalRange(
      transformedRange.transformedFileName,
      argsRange.start,
      argsRange.end
    );

    // Append to the end Arg Signature
    const changes = ChangesFactory.insertText(
      d.file,
      originalSignatureRange.originalStart,
      `\n${argName}: any;\n `
    );

    return createCodeFixAction(
      'addMissingArgToComponentSignature',
      [changes],
      'Adds the component argument to the ComponentSignature'
    );
  }
}
