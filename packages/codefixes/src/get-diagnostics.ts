import { Diagnostics } from './diagnosticInformationMap.generated.js';
import { SUPPORTED_DIAGNOSTICS } from './safe-codefixes.js';
import type { DiagnosticWithLocation } from 'typescript';

const PRIORITIZED_CODES = [
  Diagnostics.This_constructor_function_may_be_converted_to_a_class_declaration.code,
  Diagnostics.require_call_may_be_converted_to_an_import.code,
  Diagnostics.JSDoc_types_may_be_moved_to_TypeScript_types.code,
  Diagnostics.Variable_0_implicitly_has_an_1_type.code,
  Diagnostics.Parameter_0_implicitly_has_an_1_type.code,
  Diagnostics.Member_0_implicitly_has_an_1_type.code,
  Diagnostics._0_which_lacks_return_type_annotation_implicitly_has_an_1_return_type.code,
  Diagnostics.Variable_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage.code,
  Diagnostics.Parameter_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage
    .code,
  Diagnostics.Member_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage.code,
  Diagnostics
    .Variable_0_implicitly_has_type_1_in_some_locations_but_a_better_type_may_be_inferred_from_usage
    .code,
  Diagnostics._0_implicitly_has_an_1_return_type_but_a_better_type_may_be_inferred_from_usage.code,
  Diagnostics
    .Property_0_will_overwrite_the_base_property_in_1_If_this_is_intentional_add_an_initializer_Otherwise_add_a_declare_modifier_or_remove_the_redundant_declaration
    .code,
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
