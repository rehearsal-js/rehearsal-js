// replaces the positional contents in a string
// eg. "The declaration '{0}' is never read. Remove the declaration or use it."
// '{0}' is replaced with the first argument from the replacements array
export function strPositionalReplacement(message: string, replacements: string[]): string {
  replacements.map((r, i) => {
    // strip single quotes and excess whitespace from the replacements
    const posArg = r.replace(/'/gi, '').trim();
    // insert the positional arguments from the help message
    message = message.replace(`{${i}}`, posArg);
  });

  return message;
}
