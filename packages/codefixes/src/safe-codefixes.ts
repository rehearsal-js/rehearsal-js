import { CodeFixes } from './codefixInformationMap.generated.js';

export const SUPPORTED_DIAGNOSTICS = [
  ...new Set(Object.values(CodeFixes).flatMap((entry) => entry.diagnostics.map((d) => d.code))),
];

const supportedDescriptions = new Set(
  Object.values(CodeFixes).flatMap((fix) =>
    (fix.messages as { message: string }[]).map((d) => d.message)
  )
);

const supportedDescriptionsNoPlaceholder: string[] = [];
const supportedDescriptionsWithPlaceholder: string[] = [];

for (const description of supportedDescriptions) {
  if (/{\d+}/.test(description)) {
    supportedDescriptionsWithPlaceholder.push(description);
  } else {
    supportedDescriptionsNoPlaceholder.push(description);
  }
}

// One regex contains all unique descriptions: /^(description1|description2|...)$/
const supportedDescriptionsWithPlaceholderRegex = new RegExp(
  '^(' +
    supportedDescriptionsWithPlaceholder
      .map((s) => s.replace(/[/\-\\^$*+?.()|[\]]/g, '\\$&').replace(/{\d+}/g, `(.+)`))
      .join('|') +
    ')$'
);

export const isCodeFixSupportedByDescription = (fixDescription: string): boolean => {
  return (
    supportedDescriptionsNoPlaceholder.includes(fixDescription) ||
    supportedDescriptionsWithPlaceholderRegex.test(fixDescription)
  );
};

export const isCodeFixSupported = (fixId: string): boolean => {
  return fixId in CodeFixes;
};
