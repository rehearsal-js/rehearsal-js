import { createSourceFile, DiagnosticCategory, isReturnStatement, SyntaxKind } from 'typescript';
import { describe, expect, test } from 'vitest';
import { RehearsalService } from '@rehearsal/service';
import { DiagnosticWithContext } from '../src/index.js';
import { HintsProvider } from '../src/hints-provider.js';

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

function mockDiagnosticWithLocation(
  partial: DeepPartial<DiagnosticWithContext>
): DiagnosticWithContext {
  const rehearsal = new RehearsalService({}, []);
  const service = rehearsal.getLanguageService();
  const program = service.getProgram()!;
  const checker = program.getTypeChecker();

  return <DiagnosticWithContext>{
    file: createSourceFile('test.ts', '', 99, false, undefined),
    start: 0,
    length: 0,
    category: 1,
    code: 0,
    messageText: '',
    ...partial,

    service,
    program,
    checker,
  };
}

const provider = new HintsProvider({
  999: {
    hint: `Hint for error 999`,
    helpUrl: 'https://helpurl-for-999',
    hints: [
      {
        when: (n) => isReturnStatement(n),
        hint: `Hint for return statement with error 999`,
      },
    ],
  },
  888: {
    hint: `Hint for error 888 with placeholders: {node.text}, {node.fullText}`,
  },
});

describe('Test HintsProvider', () => {
  test('getHint, messageText as a single line string', () => {
    const diagnostic = mockDiagnosticWithLocation({
      code: 111,
      messageText: 'String message for 111',
    });

    const message = provider.getHint(diagnostic);

    expect(message).toEqual('String message for 111');
  });

  test('getHint, messageText as a multiline line string', () => {
    const diagnostic = mockDiagnosticWithLocation({
      code: 222,
      messageText: 'String message for 444\rTry to do something else',
    });

    const message = provider.getHint(diagnostic);

    expect(message).toEqual('String message for 444. Try to do something else');
  });

  test('getHint, messageText as a DiagnosticMessageChain', () => {
    const diagnostic = mockDiagnosticWithLocation({
      code: 333,
      messageText: {
        messageText: 'Chain-root',
        category: DiagnosticCategory.Message,
        code: 444,
        next: [
          {
            messageText: 'Chain-child',
            category: DiagnosticCategory.Error,
            code: 555,
          },
          {
            messageText: 'Error 333',
            category: DiagnosticCategory.Error,
            code: 666,
          },
        ],
      },
    });

    const message = provider.getHint(diagnostic);

    expect(message).toEqual('Chain-root.  Chain-child.  Error 333');
  });

  test('getHint, use default hint instead of original error message', () => {
    const diagnostic = mockDiagnosticWithLocation({
      code: 999,
      messageText: 'We have a predefined hint instead of this error',
    });

    const message = provider.getHint(diagnostic);

    expect(message).toEqual('Hint for error 999');
  });

  test('getHint, use conditional hint instead of original error message', () => {
    const diagnostic = mockDiagnosticWithLocation({
      code: 999,
      messageText: 'We have a predefined hint instead of this error',
      node: {
        kind: SyntaxKind.ReturnStatement,
        getText: () => 'text',
        getFullText: () => 'full-text',
      },
    });

    const message = provider.getHint(diagnostic);

    expect(message).toEqual('Hint for return statement with error 999');
  });

  test('getHint, use predefined hint with placeholders', () => {
    const diagnostic = mockDiagnosticWithLocation({
      code: 888,
      messageText: 'We have a predefined hint instead of this error',
      node: {
        kind: SyntaxKind.ReturnStatement,
        getText: () => 'text',
        getFullText: () => 'full-text',
      },
    });

    const message = provider.getHint(diagnostic);

    expect(message).toEqual('Hint for error 888 with placeholders: text, full-text');
  });
});
