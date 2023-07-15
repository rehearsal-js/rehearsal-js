import { Diagnostics } from './diagnosticInformationMap.generated.js';
import { SUPPORTED_DIAGNOSTICS } from './safe-codefixes.js';
import type { DiagnosticWithLocation } from 'typescript';

const PRIORITIZED_CODES: number[] = [
  Diagnostics.TS80002.code,
  Diagnostics.TS80005.code,
  Diagnostics.TS80009.code,
  Diagnostics.TS80004.code,
  Diagnostics.TS7005.code,
  Diagnostics.TS7006.code,
  Diagnostics.TS7008.code,
  Diagnostics.TS7010.code,
  Diagnostics.TS7043.code,
  Diagnostics.TS7044.code,
  Diagnostics.TS7045.code,
  Diagnostics.TS7046.code,
  Diagnostics.TS7050.code,
  Diagnostics.TS2612.code,
  Diagnostics.TS4073.code,
];

/**
 * Sorts diagnostics by the `start` position with prioritization of diagnostic have codes in `prioritizedCodes`.
 * If the diagnostic has the code mentioned in the `prioritizedCodes` list, it will be moved to the start and will
 * be ordered against other prioritized codes in the order codes provided in the `prioritizedCodes`.
 */
export function getDiagnosticOrder(
  diagnostics: DiagnosticWithLocation[]
): DiagnosticWithLocation[] {
  const filtered = diagnostics.filter((d) => SUPPORTED_DIAGNOSTICS.includes(d.code));

  return filtered.sort((left, right) => {
    if (left.code != right.code) {
      const leftIndex = PRIORITIZED_CODES.indexOf(left.code);
      const rightIndex = PRIORITIZED_CODES.indexOf(right.code);

      // Sort prioritized codes by how they ordered in `prioritizedCodes`
      if (leftIndex >= 0 && rightIndex >= 0) {
        return leftIndex - rightIndex;
      }

      if (leftIndex >= 0) {
        return -1;
      }

      if (rightIndex >= 0) {
        return 1;
      }
    }

    return left.start - right.start;
  });
}
