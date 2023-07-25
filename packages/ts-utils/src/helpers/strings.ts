import type { TextChange } from 'typescript';

/**
 * Applies text change (ts.TextChange) to the text string
 */
export function applyTextChange(text: string, textChange: TextChange): string {
  return (
    text.substring(0, textChange.span.start) +
    textChange.newText +
    text.substring(textChange.span.start + textChange.span.length)
  );
}

/**
 * Applies a bunch of text changes (ts.TextChange[]) to the text string from the bottom up
 */
export function applyTextChanges(text: string, textChanges: TextChange[]): string {
  textChanges = normalizeTextChanges(textChanges);

  for (const textChange of textChanges) {
    text = applyTextChange(text, textChange);
  }

  return text;
}

/**
 * Compares two text changes
 */
export function isSameChange(a: TextChange, b: TextChange): boolean {
  return (
    a.span.start === b.span.start && a.span.length === b.span.length && a.newText === b.newText
  );
}

/**
 * Prepares text changes to be applying to file
 * by removing duplicates and sort them backwards to apply from the bottom of the file,
 * so we don't need to worry about changes to be applied in a wrong place
 */
export function normalizeTextChanges(textChanges: TextChange[]): TextChange[] {
  // TODO: Probably need to remove overlapping entries, see `normalizeEdits` from `parserharness.ts` of TS source code
  return textChanges
    .sort((a, b) => b.span.start - a.span.start)
    .filter((e, i, a) => !i || !isSameChange(e, a[i - 1]));
}
