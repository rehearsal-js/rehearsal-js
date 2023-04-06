import { resolve, parse } from 'path';
import fs from 'fs';

/* Existing comment */
const thisConstant = 'is never read';

let thisVariable: number;   // is never read

function thisFunctionIsNeverRead(): void {
  return;
}

export function usesMissingFunction(): void {
  return whereAmI();
}

export function usesMissingVariable(): boolean {
  const something = true;
  const existingVar = true;

  return something
    ? missingVar
    : existingVar;
}

export function usesMissingVarWithLongName(): boolean {
  const something = true;

  return something
    ? missingVar
    : missingVarAsWellButThisTimeWeUseVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryLongString;
}

function notProperlyFormatted(file: string): string {
    return                  doSomething(file);
    }

   /**
    * Existing multiline comment
    */
   function thisFunctionIsACompleteMess(  inSeconds = false):   string {
      // Existing comment
      const resolved = resolve('a');
      foo = '6';
      function timestamp(  inMinutes = false): void { const b = null; return 'a'; }

   return resolved; }

// The next function call is not properly formatted
timestamp(   );
   
import testModule from './module';

testModule();
