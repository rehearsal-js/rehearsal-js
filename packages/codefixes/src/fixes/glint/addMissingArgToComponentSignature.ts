import { extname } from 'node:path';
import ts from 'typescript';
import { GlintService } from '@rehearsal/service';
import { ChangesFactory, findNodeAtPosition, getInterfaceByName } from '@rehearsal/ts-utils';
import { Diagnostics } from '../../diagnosticInformationMap.generated.js';
import { createCodeFixAction } from '../../hints-codefix-collection.js';
import {
  hasComponentSignature,
  getIdentifierForComponent,
  parse as tsParse,
  hasPropertyOnComponentSignatureInterface,
  getComponentSignatureInterfaceNode,
  getPropertyOnComponentSignatureInterface,
  getJSDocExtendsTagWithSignature,
  getNearestComponentClassDeclaration,
  getClassNameFromClassDeclaration,
} from './glint-parsing-utils.js';
import type { CodeFix, DiagnosticWithContext } from '../../types.js';

interface GlintDiagnosticWithContext extends DiagnosticWithContext {
  glintService: GlintService;
}

export class AddMissingArgToComponentSignature implements CodeFix {
  getErrorCodes = (): number[] => [Diagnostics.TS2339.code];

  getCodeAction(diagnostic: DiagnosticWithContext): ts.CodeFixAction | undefined {
    const glintDiagnostic = diagnostic as GlintDiagnosticWithContext;
    const glintService = glintDiagnostic.glintService;

    // Only support .gts files and not .hbs
    if (extname(glintDiagnostic.file.fileName) !== '.gts') {
      return;
    }
    const fileName = glintDiagnostic.file.fileName;
    const originalStart = glintDiagnostic.start;
    const originalEnd = originalStart + glintDiagnostic.length;

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

    if (!argName) {
      return;
    }

    const transformedContent = glintService.transformManager.readTransformedFile(fileName, 'utf8');

    if (!transformedContent) {
      return;
    }

    const sourceFile = tsParse(fileName, transformedContent);

    const targetNode = findNodeAtPosition(
      sourceFile,
      transformedRange.transformedStart,
      transformedRange.transformedEnd - transformedRange.transformedStart
    );

    if (!targetNode) {
      return;
    }

    const classDeclaration = getNearestComponentClassDeclaration(targetNode);

    if (!classDeclaration) {
      return;
    }

    if (!hasComponentSignature(classDeclaration)) {
      return this.fixMissingComponentSignatureInterface(
        glintDiagnostic,
        sourceFile,
        classDeclaration
      );
    }

    const componentSignatureInterface = getComponentSignatureInterfaceNode(
      sourceFile,
      classDeclaration
    );

    if (!componentSignatureInterface) {
      // Should never hit this branch, just makes it easier for type assertions
      return;
    }

    // Check to see if an Args property exists on the interface;
    if (!hasPropertyOnComponentSignatureInterface(componentSignatureInterface, 'Args')) {
      return this.fixMissingPropertyArgsOnComponentSignatureInterface(
        glintDiagnostic,
        sourceFile,
        componentSignatureInterface
      );
    }

    return this.fixMissingArgumentOnArgsProperty(
      glintDiagnostic,
      sourceFile,
      componentSignatureInterface,
      argName
    );
  }

  private fixMissingComponentSignatureInterface(
    d: GlintDiagnosticWithContext,
    sourceFile: ts.SourceFile,
    classDeclaration: ts.ClassDeclaration
  ): ts.CodeFixAction | undefined {
    const componentClassName = getClassNameFromClassDeclaration(classDeclaration);

    const componentIdentifier = getIdentifierForComponent(classDeclaration);

    if (!componentIdentifier) {
      return;
    }

    const originalSuperClassIdentifierRange = d.glintService.transformManager.getOriginalRange(
      sourceFile.fileName,
      componentIdentifier.pos,
      componentIdentifier.end
    );

    // At this point we know there isn't a component signature on the SuperClass
    // We will determine name by checking the comment for a recommended interface
    const signatureName =
      getJSDocExtendsTagWithSignature(classDeclaration) ?? `${componentClassName}Signature`;

    const changes: [ts.FileTextChanges] = [
      // Augment the SuperClass signature first as it's lower in the file
      ChangesFactory.insertText(
        d.file,
        originalSuperClassIdentifierRange.originalEnd,
        `<${signatureName}>`
      ),
    ];

    if (!getInterfaceByName(sourceFile, signatureName)) {
      const originalExportRange = d.glintService.transformManager.getOriginalRange(
        sourceFile.fileName,
        classDeclaration.pos,
        classDeclaration.end
      );
      // Add interface above class decl
      const addSignatureChange = ChangesFactory.insertText(
        d.file,
        originalExportRange.originalStart,
        `\n\nexport interface ${signatureName} { Args: {} }\n\n`
      );

      changes.push(addSignatureChange);
    }

    return createCodeFixAction(
      'addMissingArgToComponentSignature',
      changes,
      'Adds the Arg property to the Component Signature'
    );
  }

  private fixMissingPropertyArgsOnComponentSignatureInterface(
    d: GlintDiagnosticWithContext,
    sourceFile: ts.SourceFile,
    interfaceNode: ts.InterfaceDeclaration
  ): ts.CodeFixAction | undefined {
    const originalInterfaceRange = d.glintService.transformManager.getOriginalRange(
      sourceFile.fileName,
      interfaceNode.members.pos,
      interfaceNode.members.end
    );

    return createCodeFixAction(
      'addMissingArgToComponentSignature',
      [ChangesFactory.insertText(d.file, originalInterfaceRange.originalStart, `Args: {};`)],
      'Adds the Arg property to the Component Signature'
    );
  }

  private fixMissingArgumentOnArgsProperty(
    d: GlintDiagnosticWithContext,
    sourceFile: ts.SourceFile,
    interfaceNode: ts.InterfaceDeclaration,
    argName: string
  ): ts.CodeFixAction | undefined {
    const propertySignatureNode = getPropertyOnComponentSignatureInterface(interfaceNode, 'Args');

    if (!propertySignatureNode || !propertySignatureNode.type) {
      return;
    }

    // In some cases we may have the Args object defined as a separate
    // interface rather than a literal on the component signature.

    let argsInterfaceNode: ts.InterfaceDeclaration | ts.TypeLiteralNode;

    if (ts.isTypeLiteralNode(propertySignatureNode.type)) {
      argsInterfaceNode = propertySignatureNode.type;
    } else if (ts.isTypeReferenceNode(propertySignatureNode.type)) {
      if (!ts.isIdentifier(propertySignatureNode.type.typeName)) {
        return;
      }

      const foundInterface = getInterfaceByName(
        sourceFile,
        propertySignatureNode.type.typeName.escapedText.toString()
      );

      if (!foundInterface) {
        return;
      }

      argsInterfaceNode = foundInterface;
    } else {
      return;
    }

    const originalArgsSignatureRange = d.glintService.transformManager.getOriginalRange(
      sourceFile.fileName,
      argsInterfaceNode.members.pos,
      argsInterfaceNode.members.end
    );

    return createCodeFixAction(
      'addMissingArgToComponentSignature',
      [
        ChangesFactory.insertText(
          d.file,
          originalArgsSignatureRange.originalEnd,
          `${argName}: any;`
        ),
      ],
      'Adds the component argument to the Args property of the Component Signature'
    );
  }
}
