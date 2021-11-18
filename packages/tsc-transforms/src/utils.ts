export function strPositionalReplacement(
  message: string,
  replacements: string[]
): string {
  replacements.forEach((arg, i) => {
    message = message.replace(`{${i}}`, arg);
  });

  return message;
}
