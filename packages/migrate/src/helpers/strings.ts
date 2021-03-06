/**
 * Checks if there are changes in the code between to strings
 * by comparing code without empty spaces between structures.
 */
export function isSourceCodeChanged(originalText: string, updateText: string): boolean {
  // Compares source codes without spaces.
  return originalText.replace(/\s+/g, ' ') !== updateText.replace(/\s+/g, ' ');
}
