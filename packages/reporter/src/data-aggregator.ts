import ts from 'typescript';
import { FixResult, ProcessedFile, FileRole } from './types';

export class DataAggregator {
  private static instance: DataAggregator;
  static getInstance(diagnostic: ts.DiagnosticWithLocation): DataAggregator {
    if(!DataAggregator.instance || DataAggregator.instance.diagnostic !== diagnostic ) {
      DataAggregator.instance = new DataAggregator(diagnostic);
    }
    return DataAggregator.instance;
  }
  
  private result: FixResult;
  private diagnostic: ts.DiagnosticWithLocation;
  
  constructor(diagnostic: ts.DiagnosticWithLocation) {
    this.diagnostic = diagnostic;
    this.result = this.getInitialResult(this.diagnostic);
  }

  getInitialResult(diagnostic: ts.DiagnosticWithLocation): FixResult {
    const { file, start } = diagnostic;
    const location = this.getLocation(file, start);
    return {
      analysisTarget: file.fileName,
      files: {
        [file.fileName]: {
          ...this.buildFile(file.fileName),
          location,
          roles: ['analysisTarget', 'unmodified'],
        },
      },
      fixed: false,
      hintAdded: false,
    };
  }

  addCommentDataToResult(
    fileName: string,
    hint = '',
    roles: FileRole[] = [],
    location?: { line: number | undefined; character: number | undefined }
  ): void {
    if(this.result) {
      const file = fileName in this.result.files ? this.result.files[fileName] : this.buildFile(fileName);
      this.result.files[fileName] = {
        ...file,
        hintAdded: true,
        location: location || file.location,
        hint,
        roles: this.mergeRoles(file.roles, roles),
      };
      this.result = {
        ...this.result,
        hintAdded: true
      }
    };
  }

  addCodemodDataToResult(
    fileName: string,
    updatedText = '',
    code = '',
    roles: FileRole[] = [],
    location?: { line: number | undefined; character: number | undefined },
  ): void {
    if(this.result) {
      const file = fileName in this.result.files ? this.result.files[fileName] : this.buildFile(fileName);
      this.result.files[fileName] = {
        ...file,
        fixed: true,
        updatedText,
        location: location || file.location,
        code,
        roles: this.mergeRoles(file.roles, roles),
      };

      this.result = {
        ...this.result,
        fixed: true,
      }
    }
  }

  getResult(): FixResult{
    return this.result;
  }

  private buildFile(fileName: string): ProcessedFile {
    return {
      fileName,
      updatedText: '',
      location: {
        line: undefined,
        character: undefined,
      },
      fixed: false,
      code: '',
      hintAdded: false,
      hint: '',
      roles: [],
    };
  }

  private mergeRoles(existingRoles: FileRole[], newRoles: FileRole[]): FileRole[] {
    const roles = Array.from(new Set([...existingRoles, ...newRoles, 'modified' as const])).filter(
      (role) => role !== 'unmodified'
    );
    return roles;
  }

  getLocation(sourceFile: ts.SourceFile, position: number) {
    const { line, character } = ts.getLineAndCharacterOfPosition(sourceFile, position);
    return {
      line,
      character
    };
  }
}