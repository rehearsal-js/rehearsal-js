import { CodeFixCollection, DiagnosticWithContext, FixTransform } from '.';

/**
 * Provides
 */
export class BaseCodeFixCollection implements CodeFixCollection {
  readonly list;

  constructor(list: { [key: number]: FixTransform }) {
    this.list = list;
  }

  getFixForDiagnostic(diagnostic: DiagnosticWithContext): FixTransform | undefined {
    if (this.list[diagnostic.code] !== undefined) {
      return this.list[diagnostic.code];
    }

    return undefined;
  }
}
