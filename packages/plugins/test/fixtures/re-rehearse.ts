/**
 * This is a file with some comments added in a previous run of rehearsal
 */
import fs from 'fs';

// @rehearsal TODO TS6133: This message should be updated...
function unusedFunction(): boolean {
  return fs.existsSync('.');
}

// @rehearsal TODO TS007: This comment should be kept, plus another comment needs to be added 6133. */
let unusedVariable: number;

/* This is just a second comment that should not be touch */
// @rehearsal TODO TS6133: The variable 'unusedConst' is never read or used. Remove the variable or use it.
const unusedConst1 = null;

// @rehearsal TODO TS6133: Comment. */ fs.existsSync('.');
const unusedConst2 = null;

fs.existsSync('.'); // @rehearsal TODO TS6133: Comment.
const unusedConst3 = null;

fs.existsSync('@rehearsal');
const unusedConstWithoutCommentButWithRehearsalTagAbove =
  null;

const resultValue = something
  ? // @rehearsal TODO TS2304: Cannot find name 'missingVar'.
    missingVar
  : // @rehearsal TODO TS2304: Cannot find name 'missingVarAsWellButThisTimeWeUseVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryLongString'.
    missingVarAsWellButThisTimeWeUseVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryLongString;
