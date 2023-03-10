import { DiagnosticWithLocation } from 'typescript';
import { Diagnostics } from './diagnosticInformationMap.generated.js';

interface Fix {
  fixName: string;
  codes: number[];
  failing: string[];
  passing: string[];
}

function fix(
  diagnosticCodes: number[],
  fixName: string,
  title: string,
  description: string,
  passing: string[],
  failing: string[]
): Fix {
  return {
    title,
    description,
    codes: diagnosticCodes,
    fixName,
    failing,
    passing,
  };
}

// const allErrorDiagnostics = (Object.keys(Diagnostics) as readonly (keyof typeof Diagnostics)[])
//   .map((d) =>
//     Diagnostics[d].category === DiagnosticCategory.Error ? Diagnostics[d].code : undefined
//   )
//   .filter(removeUndefined);

// function removeUndefined(maybeCode: number | undefined): maybeCode is number {
//   return maybeCode !== undefined;
// }

export const Fixes = {
  addMissingAsync: fix(
    [
      Diagnostics.Argument_of_type_0_is_not_assignable_to_parameter_of_type_1.code,
      Diagnostics.Type_0_is_not_assignable_to_type_1.code,
      Diagnostics.Type_0_is_not_comparable_to_type_1.code,
    ],
    'addMissingAsync'
  ),
  addMissingAwait: fix(
    [
      Diagnostics.An_arithmetic_operand_must_be_of_type_any_number_bigint_or_an_enum_type.code,
      Diagnostics
        .The_left_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_bigint_or_an_enum_type
        .code,
      Diagnostics
        .The_right_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_bigint_or_an_enum_type
        .code,
      Diagnostics.Operator_0_cannot_be_applied_to_type_1.code,
      Diagnostics.Operator_0_cannot_be_applied_to_types_1_and_2.code,
      Diagnostics
        .This_comparison_appears_to_be_unintentional_because_the_types_0_and_1_have_no_overlap.code,
      Diagnostics.This_condition_will_always_return_true_since_this_0_is_always_defined.code,
      Diagnostics.Type_0_is_not_an_array_type.code,
      Diagnostics.Type_0_is_not_an_array_type_or_a_string_type.code,
      Diagnostics
        .Type_0_can_only_be_iterated_through_when_using_the_downlevelIteration_flag_or_with_a_target_of_es2015_or_higher
        .code,
      Diagnostics
        .Type_0_is_not_an_array_type_or_a_string_type_or_does_not_have_a_Symbol_iterator_method_that_returns_an_iterator
        .code,
      Diagnostics
        .Type_0_is_not_an_array_type_or_does_not_have_a_Symbol_iterator_method_that_returns_an_iterator
        .code,
      Diagnostics.Type_0_must_have_a_Symbol_iterator_method_that_returns_an_iterator.code,
      Diagnostics.Type_0_must_have_a_Symbol_asyncIterator_method_that_returns_an_async_iterator
        .code,
      Diagnostics.Argument_of_type_0_is_not_assignable_to_parameter_of_type_1.code,
      Diagnostics.Property_0_does_not_exist_on_type_1.code,
      Diagnostics.This_expression_is_not_callable.code,
      Diagnostics.This_expression_is_not_constructable.code,
    ],
    'addMissingAwait'
  ),
  addMissingAwaitToInitializer: fix(
    [Diagnostics.Add_await_to_initializer_for_0.code, Diagnostics.Add_await_to_initializers.code],
    'addMissingAwaitToInitializer'
  ),
  addMissingConst: fix(
    [
      Diagnostics.Cannot_find_name_0.code,
      Diagnostics
        .No_value_exists_in_scope_for_the_shorthand_property_0_Either_declare_one_or_provide_an_initializer
        .code,
    ],
    'addMissingConst'
  ),
  addMissingConstraint: fix(
    [
      Diagnostics.Type_0_is_not_comparable_to_type_1.code,
      Diagnostics
        .Type_0_is_not_assignable_to_type_1_Two_different_types_with_this_name_exist_but_they_are_unrelated
        .code,
      Diagnostics
        .Type_0_is_not_assignable_to_type_1_with_exactOptionalPropertyTypes_Colon_true_Consider_adding_undefined_to_the_types_of_the_target_s_properties
        .code,
      Diagnostics.Type_0_is_not_assignable_to_type_1.code,
      Diagnostics
        .Argument_of_type_0_is_not_assignable_to_parameter_of_type_1_with_exactOptionalPropertyTypes_Colon_true_Consider_adding_undefined_to_the_types_of_the_target_s_properties
        .code,
      Diagnostics.Property_0_is_incompatible_with_index_signature.code,
      Diagnostics.Property_0_in_type_1_is_not_assignable_to_type_2.code,
      Diagnostics.Type_0_does_not_satisfy_the_constraint_1.code,
    ],
    'addMissingConstraint'
  ),
  addMissingDeclareProperty: fix(
    [
      Diagnostics
        .Property_0_will_overwrite_the_base_property_in_1_If_this_is_intentional_add_an_initializer_Otherwise_add_a_declare_modifier_or_remove_the_redundant_declaration
        .code,
    ],
    'addMissingDeclareProperty'
  ),
  addMissingInvocationForDecorator: fix(
    [
      Diagnostics
        ._0_accepts_too_few_arguments_to_be_used_as_a_decorator_here_Did_you_mean_to_call_it_first_and_write_0
        .code,
    ],
    'addMissingInvocationForDecorator'
  ),
  addMissingNewOperator: fix(
    [Diagnostics.Value_of_type_0_is_not_callable_Did_you_mean_to_include_new.code],
    'addMissingNewOperator'
  ),
  addOptionalPropertyUndefined: fix(
    [
      Diagnostics
        .Type_0_is_not_assignable_to_type_1_with_exactOptionalPropertyTypes_Colon_true_Consider_adding_undefined_to_the_type_of_the_target
        .code,
      Diagnostics
        .Type_0_is_not_assignable_to_type_1_with_exactOptionalPropertyTypes_Colon_true_Consider_adding_undefined_to_the_types_of_the_target_s_properties
        .code,
      Diagnostics
        .Argument_of_type_0_is_not_assignable_to_parameter_of_type_1_with_exactOptionalPropertyTypes_Colon_true_Consider_adding_undefined_to_the_types_of_the_target_s_properties
        .code,
    ],
    'addOptionalPropertyUndefined'
  ),
  addVoidToPromise: fix(
    [
      Diagnostics
        .Expected_1_argument_but_got_0_new_Promise_needs_a_JSDoc_hint_to_produce_a_resolve_that_can_be_called_without_arguments
        .code,
      Diagnostics
        .Expected_0_arguments_but_got_1_Did_you_forget_to_include_void_in_your_type_argument_to_Promise
        .code,
    ],
    'addVoidToPromise'
  ),
  annotateWithTypeFromJSDoc: fix(
    [Diagnostics.JSDoc_types_may_be_moved_to_TypeScript_types.code],
    'annotateWithTypeFromJSDoc'
  ),
  constructorForDerivedNeedSuperCall: fix(
    [Diagnostics.Constructors_for_derived_classes_must_contain_a_super_call.code],
    'constructorForDerivedNeedSuperCall'
  ),
  convertFunctionToEs6Class: fix(
    [Diagnostics.This_constructor_function_may_be_converted_to_a_class_declaration.code],
    'convertFunctionToEs6Class'
  ),
  convertToTypeOnlyExport: fix(
    [Diagnostics.Re_exporting_a_type_when_0_is_enabled_requires_using_export_type.code],
    'convertToTypeOnlyExport'
  ),

  convertToTypeOnlyImport: fix(
    [
      Diagnostics
        .This_import_is_never_used_as_a_value_and_must_use_import_type_because_importsNotUsedAsValues_is_set_to_error
        .code,
      Diagnostics
        ._0_is_a_type_and_must_be_imported_using_a_type_only_import_when_verbatimModuleSyntax_is_enabled
        .code,
    ],
    'convertToTypeOnlyImport'
  ),

  deleteUnmatchedParameter: fix(
    [Diagnostics.JSDoc_param_tag_has_name_0_but_there_is_no_parameter_with_that_name.code],
    'deleteUnmatchedParameter'
  ),
  extendsInterfaceBecomesImplements: fix(
    [Diagnostics.Cannot_extend_an_interface_0_Did_you_mean_implements.code],
    'extendsInterfaceBecomesImplements'
  ),
  fixAwaitInSyncFunction: fix(
    [
      Diagnostics
        .await_expressions_are_only_allowed_within_async_functions_and_at_the_top_levels_of_modules
        .code,
      Diagnostics
        .for_await_loops_are_only_allowed_within_async_functions_and_at_the_top_levels_of_modules
        .code,
      Diagnostics.Cannot_find_name_0_Did_you_mean_to_write_this_in_an_async_function.code,
    ],
    'fixAwaitInSyncFunction'
  ),
  fixCannotFindModule: fix(
    [
      Diagnostics.Cannot_find_module_0_or_its_corresponding_type_declarations.code,
      Diagnostics.Could_not_find_a_declaration_file_for_module_0_1_implicitly_has_an_any_type.code,
    ],
    'fixCannotFindModule'
  ),

  fixEnableJsxFlag: fix(
    [Diagnostics.Cannot_use_JSX_unless_the_jsx_flag_is_provided.code],
    'fixEnableJsxFlag'
  ),

  fixImportNonExportedMember: fix(
    [Diagnostics.Module_0_declares_1_locally_but_it_is_not_exported.code],
    'fixImportNonExportedMember'
  ),

  fixMissingAttributes: fix(
    [
      Diagnostics.Property_0_does_not_exist_on_type_1.code,
      Diagnostics.Property_0_does_not_exist_on_type_1_Did_you_mean_2.code,
      Diagnostics.Property_0_is_missing_in_type_1_but_required_in_type_2.code,
      Diagnostics.Type_0_is_missing_the_following_properties_from_type_1_Colon_2.code,
      Diagnostics.Type_0_is_missing_the_following_properties_from_type_1_Colon_2_and_3_more.code,
      Diagnostics.Argument_of_type_0_is_not_assignable_to_parameter_of_type_1.code,
      Diagnostics.Cannot_find_name_0.code,
    ],
    'fixMissingAttributes'
  ),
  fixMissingMember: fix(
    [
      Diagnostics.Property_0_does_not_exist_on_type_1.code,
      Diagnostics.Property_0_does_not_exist_on_type_1_Did_you_mean_2.code,
      Diagnostics.Property_0_is_missing_in_type_1_but_required_in_type_2.code,
      Diagnostics.Type_0_is_missing_the_following_properties_from_type_1_Colon_2.code,
      Diagnostics.Type_0_is_missing_the_following_properties_from_type_1_Colon_2_and_3_more.code,
      Diagnostics.Argument_of_type_0_is_not_assignable_to_parameter_of_type_1.code,
      Diagnostics.Cannot_find_name_0.code,
    ],
    'fixMissingMember'
  ),
  fixMissingProperties: fix(
    [
      Diagnostics.Property_0_does_not_exist_on_type_1.code,
      Diagnostics.Property_0_does_not_exist_on_type_1_Did_you_mean_2.code,
      Diagnostics.Property_0_is_missing_in_type_1_but_required_in_type_2.code,
      Diagnostics.Type_0_is_missing_the_following_properties_from_type_1_Colon_2.code,
      Diagnostics.Type_0_is_missing_the_following_properties_from_type_1_Colon_2_and_3_more.code,
      Diagnostics.Argument_of_type_0_is_not_assignable_to_parameter_of_type_1.code,
      Diagnostics.Cannot_find_name_0.code,
    ],
    'fixMissingProperties'
  ),

  fixOverrideModifier: fix(
    [
      Diagnostics
        .This_member_cannot_have_an_override_modifier_because_it_is_not_declared_in_the_base_class_0
        .code,
      Diagnostics
        .This_member_cannot_have_an_override_modifier_because_its_containing_class_0_does_not_extend_another_class
        .code,
      Diagnostics
        .This_member_must_have_an_override_modifier_because_it_overrides_an_abstract_method_that_is_declared_in_the_base_class_0
        .code,
      Diagnostics
        .This_member_must_have_an_override_modifier_because_it_overrides_a_member_in_the_base_class_0
        .code,
      Diagnostics
        .This_parameter_property_must_have_an_override_modifier_because_it_overrides_a_member_in_base_class_0
        .code,
      Diagnostics
        .This_member_must_have_a_JSDoc_comment_with_an_override_tag_because_it_overrides_a_member_in_the_base_class_0
        .code,
      Diagnostics
        .This_member_cannot_have_a_JSDoc_comment_with_an_override_tag_because_its_containing_class_0_does_not_extend_another_class
        .code,
      Diagnostics
        .This_parameter_property_must_have_a_JSDoc_comment_with_an_override_tag_because_it_overrides_a_member_in_the_base_class_0
        .code,
      Diagnostics
        .This_member_cannot_have_a_JSDoc_comment_with_an_override_tag_because_it_is_not_declared_in_the_base_class_0
        .code,
    ],
    'fixOverrideModifier'
  ),
  fixReturnTypeInAsyncFunction: fix(
    [
      Diagnostics
        .The_return_type_of_an_async_function_or_method_must_be_the_global_Promise_T_type_Did_you_mean_to_write_Promise_0
        .code,
    ],
    'fixReturnTypeInAsyncFunction'
  ),
  import: fix(
    [
      Diagnostics.Cannot_find_name_0.code,
      Diagnostics.Cannot_find_name_0_Did_you_mean_1.code,
      Diagnostics.Cannot_find_name_0_Did_you_mean_the_instance_member_this_0.code,
      Diagnostics.Cannot_find_name_0_Did_you_mean_the_static_member_1_0.code,
      Diagnostics.Cannot_find_namespace_0.code,
      Diagnostics
        ._0_refers_to_a_UMD_global_but_the_current_file_is_a_module_Consider_adding_an_import_instead
        .code,
      Diagnostics._0_only_refers_to_a_type_but_is_being_used_as_a_value_here.code,
      Diagnostics
        .No_value_exists_in_scope_for_the_shorthand_property_0_Either_declare_one_or_provide_an_initializer
        .code,
      Diagnostics._0_cannot_be_used_as_a_value_because_it_was_imported_using_import_type.code,
    ],
    'import'
  ),
  inferFromUsage: fix(
    [
      // Variable declarations
      Diagnostics
        .Variable_0_implicitly_has_type_1_in_some_locations_where_its_type_cannot_be_determined
        .code,

      // Variable uses
      Diagnostics.Variable_0_implicitly_has_an_1_type.code,

      // Parameter declarations
      Diagnostics.Parameter_0_implicitly_has_an_1_type.code,
      Diagnostics.Rest_parameter_0_implicitly_has_an_any_type.code,

      // Get Accessor declarations
      Diagnostics
        .Property_0_implicitly_has_type_any_because_its_get_accessor_lacks_a_return_type_annotation
        .code,
      Diagnostics._0_which_lacks_return_type_annotation_implicitly_has_an_1_return_type.code,

      // Set Accessor declarations
      Diagnostics
        .Property_0_implicitly_has_type_any_because_its_set_accessor_lacks_a_parameter_type_annotation
        .code,

      // Property declarations
      Diagnostics.Member_0_implicitly_has_an_1_type.code,

      //// Suggestions
      // Variable declarations
      Diagnostics
        .Variable_0_implicitly_has_type_1_in_some_locations_but_a_better_type_may_be_inferred_from_usage
        .code,

      // Variable uses
      Diagnostics.Variable_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage
        .code,

      // Parameter declarations
      Diagnostics.Parameter_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage
        .code,
      Diagnostics
        .Rest_parameter_0_implicitly_has_an_any_type_but_a_better_type_may_be_inferred_from_usage
        .code,

      // Get Accessor declarations
      Diagnostics
        .Property_0_implicitly_has_type_any_but_a_better_type_for_its_get_accessor_may_be_inferred_from_usage
        .code,
      Diagnostics._0_implicitly_has_an_1_return_type_but_a_better_type_may_be_inferred_from_usage
        .code,

      // Set Accessor declarations
      Diagnostics
        .Property_0_implicitly_has_type_any_but_a_better_type_for_its_set_accessor_may_be_inferred_from_usage
        .code,

      // Property declarations
      Diagnostics.Member_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage
        .code,

      // Function expressions and declarations
      Diagnostics.this_implicitly_has_type_any_because_it_does_not_have_a_type_annotation.code,
    ],
    'inferFromUsage'
  ),
  invalidImportSyntax: fix(
    [
      Diagnostics.Argument_of_type_0_is_not_assignable_to_parameter_of_type_1.code,
      Diagnostics.Type_0_does_not_satisfy_the_constraint_1.code,
      Diagnostics.Type_0_is_not_assignable_to_type_1.code,
      Diagnostics
        .Type_0_is_not_assignable_to_type_1_Two_different_types_with_this_name_exist_but_they_are_unrelated
        .code,
      Diagnostics.Type_predicate_0_is_not_assignable_to_1.code,
      Diagnostics.Property_0_of_type_1_is_not_assignable_to_2_index_type_3.code,
      Diagnostics._0_index_type_1_is_not_assignable_to_2_index_type_3.code,
      Diagnostics.Property_0_in_type_1_is_not_assignable_to_the_same_property_in_base_type_2.code,
      Diagnostics.Property_0_in_type_1_is_not_assignable_to_type_2.code,
      Diagnostics.Property_0_of_JSX_spread_attribute_is_not_assignable_to_target_property.code,
      Diagnostics.The_this_context_of_type_0_is_not_assignable_to_method_s_this_of_type_1.code,
      Diagnostics.This_expression_is_not_callable.code,
      Diagnostics.This_expression_is_not_constructable.code,
    ],
    'invalidImportSyntax'
  ),
  jdocTypes: fix([Diagnostics.Change_0_to_1.code], 'jdocTypes'),
  removeUnnecessaryAwait: fix(
    [Diagnostics.await_has_no_effect_on_the_type_of_this_expression.code],
    'removeUnnecessaryAwait'
  ),
  requireInTs: fix([Diagnostics.require_call_may_be_converted_to_an_import.code], 'requireInTs'),
  strictClassInitialization: fix(
    [
      Diagnostics.Property_0_has_no_initializer_and_is_not_definitely_assigned_in_the_constructor
        .code,
    ],
    'strictClassInitialization'
  ),
  unusedIdentifier: fix(
    [
      Diagnostics._0_is_declared_but_its_value_is_never_read.code,
      Diagnostics._0_is_declared_but_never_used.code,
      Diagnostics.Property_0_is_declared_but_its_value_is_never_read.code,
      Diagnostics.All_imports_in_import_declaration_are_unused.code,
      Diagnostics.All_destructured_elements_are_unused.code,
      Diagnostics.All_variables_are_unused.code,
      Diagnostics.All_type_parameters_are_unused.code,
    ],
    'unusedIdentifier'
  ),
  useDefaultImport: fix(
    [Diagnostics.Import_may_be_converted_to_a_default_import.code],
    'useDefaultImport'
  ),
};

const Prioritized = [
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

const FIX_NAMES = Object.keys(Fixes);

export const hasFix = (fixName: string): fixName is keyof typeof Fixes => {
  return FIX_NAMES.includes(fixName);
};

const AllSupportedDiagnosticCodes = Object.values(Fixes).flatMap((fix) => {
  return fix.codes;
});

export const isDiagnosticSupported = (diagnostic: DiagnosticWithLocation): boolean => {
  return AllSupportedDiagnosticCodes.includes(diagnostic.code);
};

export function eligiableDiagnostics(
  diagnostics: DiagnosticWithLocation[]
): DiagnosticWithLocation[] {
  const filtered = diagnostics.filter(isDiagnosticSupported);
  filtered.sort((left, right) => {
    if (left.code != right.code) {
      const leftIndex = Prioritized.indexOf(left.code);
      const rightIndex = Prioritized.indexOf(right.code);

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

  return filtered;
}

export const Fixes = {
  addMissingAsync: fix(
    [
      Diagnostics.Argument_of_type_0_is_not_assignable_to_parameter_of_type_1.code,
      Diagnostics.Type_0_is_not_assignable_to_type_1.code,
      Diagnostics.Type_0_is_not_comparable_to_type_1.code,
    ],
    'addMissingAsync'
  ),
  addMissingAwait: fix(
    [
      Diagnostics.An_arithmetic_operand_must_be_of_type_any_number_bigint_or_an_enum_type.code,
      Diagnostics
        .The_left_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_bigint_or_an_enum_type
        .code,
      Diagnostics
        .The_right_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_bigint_or_an_enum_type
        .code,
      Diagnostics.Operator_0_cannot_be_applied_to_type_1.code,
      Diagnostics.Operator_0_cannot_be_applied_to_types_1_and_2.code,
      Diagnostics
        .This_comparison_appears_to_be_unintentional_because_the_types_0_and_1_have_no_overlap.code,
      Diagnostics.This_condition_will_always_return_true_since_this_0_is_always_defined.code,
      Diagnostics.Type_0_is_not_an_array_type.code,
      Diagnostics.Type_0_is_not_an_array_type_or_a_string_type.code,
      Diagnostics
        .Type_0_can_only_be_iterated_through_when_using_the_downlevelIteration_flag_or_with_a_target_of_es2015_or_higher
        .code,
      Diagnostics
        .Type_0_is_not_an_array_type_or_a_string_type_or_does_not_have_a_Symbol_iterator_method_that_returns_an_iterator
        .code,
      Diagnostics
        .Type_0_is_not_an_array_type_or_does_not_have_a_Symbol_iterator_method_that_returns_an_iterator
        .code,
      Diagnostics.Type_0_must_have_a_Symbol_iterator_method_that_returns_an_iterator.code,
      Diagnostics.Type_0_must_have_a_Symbol_asyncIterator_method_that_returns_an_async_iterator
        .code,
      Diagnostics.Argument_of_type_0_is_not_assignable_to_parameter_of_type_1.code,
      Diagnostics.Property_0_does_not_exist_on_type_1.code,
      Diagnostics.This_expression_is_not_callable.code,
      Diagnostics.This_expression_is_not_constructable.code,
    ],
    'addMissingAwait'
  ),
  addMissingAwaitToInitializer: fix(
    [Diagnostics.Add_await_to_initializer_for_0.code, Diagnostics.Add_await_to_initializers.code],
    'addMissingAwaitToInitializer'
  ),
  addMissingConst: fix(
    [
      Diagnostics.Cannot_find_name_0.code,
      Diagnostics
        .No_value_exists_in_scope_for_the_shorthand_property_0_Either_declare_one_or_provide_an_initializer
        .code,
    ],
    'addMissingConst'
  ),
  addMissingConstraint: fix(
    [
      Diagnostics.Type_0_is_not_comparable_to_type_1.code,
      Diagnostics
        .Type_0_is_not_assignable_to_type_1_Two_different_types_with_this_name_exist_but_they_are_unrelated
        .code,
      Diagnostics
        .Type_0_is_not_assignable_to_type_1_with_exactOptionalPropertyTypes_Colon_true_Consider_adding_undefined_to_the_types_of_the_target_s_properties
        .code,
      Diagnostics.Type_0_is_not_assignable_to_type_1.code,
      Diagnostics
        .Argument_of_type_0_is_not_assignable_to_parameter_of_type_1_with_exactOptionalPropertyTypes_Colon_true_Consider_adding_undefined_to_the_types_of_the_target_s_properties
        .code,
      Diagnostics.Property_0_is_incompatible_with_index_signature.code,
      Diagnostics.Property_0_in_type_1_is_not_assignable_to_type_2.code,
      Diagnostics.Type_0_does_not_satisfy_the_constraint_1.code,
    ],
    'addMissingConstraint'
  ),
  addMissingDeclareProperty: fix(
    [
      Diagnostics
        .Property_0_will_overwrite_the_base_property_in_1_If_this_is_intentional_add_an_initializer_Otherwise_add_a_declare_modifier_or_remove_the_redundant_declaration
        .code,
    ],
    'addMissingDeclareProperty'
  ),
  addMissingInvocationForDecorator: fix(
    [
      Diagnostics
        ._0_accepts_too_few_arguments_to_be_used_as_a_decorator_here_Did_you_mean_to_call_it_first_and_write_0
        .code,
    ],
    'addMissingInvocationForDecorator'
  ),
  addMissingNewOperator: fix(
    [Diagnostics.Value_of_type_0_is_not_callable_Did_you_mean_to_include_new.code],
    'addMissingNewOperator'
  ),
  addOptionalPropertyUndefined: fix(
    [
      Diagnostics
        .Type_0_is_not_assignable_to_type_1_with_exactOptionalPropertyTypes_Colon_true_Consider_adding_undefined_to_the_type_of_the_target
        .code,
      Diagnostics
        .Type_0_is_not_assignable_to_type_1_with_exactOptionalPropertyTypes_Colon_true_Consider_adding_undefined_to_the_types_of_the_target_s_properties
        .code,
      Diagnostics
        .Argument_of_type_0_is_not_assignable_to_parameter_of_type_1_with_exactOptionalPropertyTypes_Colon_true_Consider_adding_undefined_to_the_types_of_the_target_s_properties
        .code,
    ],
    'addOptionalPropertyUndefined'
  ),
  addVoidToPromise: fix(
    [
      Diagnostics
        .Expected_1_argument_but_got_0_new_Promise_needs_a_JSDoc_hint_to_produce_a_resolve_that_can_be_called_without_arguments
        .code,
      Diagnostics
        .Expected_0_arguments_but_got_1_Did_you_forget_to_include_void_in_your_type_argument_to_Promise
        .code,
    ],
    'addVoidToPromise'
  ),
  annotateWithTypeFromJSDoc: fix(
    [Diagnostics.JSDoc_types_may_be_moved_to_TypeScript_types.code],
    'annotateWithTypeFromJSDoc'
  ),
  constructorForDerivedNeedSuperCall: fix(
    [Diagnostics.Constructors_for_derived_classes_must_contain_a_super_call.code],
    'constructorForDerivedNeedSuperCall'
  ),
  convertFunctionToEs6Class: fix(
    [Diagnostics.This_constructor_function_may_be_converted_to_a_class_declaration.code],
    'convertFunctionToEs6Class'
  ),
  convertToTypeOnlyExport: fix(
    [Diagnostics.Re_exporting_a_type_when_0_is_enabled_requires_using_export_type.code],
    'convertToTypeOnlyExport'
  ),

  convertToTypeOnlyImport: fix(
    [
      Diagnostics
        .This_import_is_never_used_as_a_value_and_must_use_import_type_because_importsNotUsedAsValues_is_set_to_error
        .code,
      Diagnostics
        ._0_is_a_type_and_must_be_imported_using_a_type_only_import_when_verbatimModuleSyntax_is_enabled
        .code,
    ],
    'convertToTypeOnlyImport'
  ),

  deleteUnmatchedParameter: fix(
    [Diagnostics.JSDoc_param_tag_has_name_0_but_there_is_no_parameter_with_that_name.code],
    'deleteUnmatchedParameter'
  ),
  extendsInterfaceBecomesImplements: fix(
    [Diagnostics.Cannot_extend_an_interface_0_Did_you_mean_implements.code],
    'extendsInterfaceBecomesImplements'
  ),
  fixAwaitInSyncFunction: fix(
    [
      Diagnostics
        .await_expressions_are_only_allowed_within_async_functions_and_at_the_top_levels_of_modules
        .code,
      Diagnostics
        .for_await_loops_are_only_allowed_within_async_functions_and_at_the_top_levels_of_modules
        .code,
      Diagnostics.Cannot_find_name_0_Did_you_mean_to_write_this_in_an_async_function.code,
    ],
    'fixAwaitInSyncFunction'
  ),
  fixCannotFindModule: fix(
    [
      Diagnostics.Cannot_find_module_0_or_its_corresponding_type_declarations.code,
      Diagnostics.Could_not_find_a_declaration_file_for_module_0_1_implicitly_has_an_any_type.code,
    ],
    'fixCannotFindModule'
  ),

  fixEnableJsxFlag: fix(
    [Diagnostics.Cannot_use_JSX_unless_the_jsx_flag_is_provided.code],
    'fixEnableJsxFlag'
  ),

  fixImportNonExportedMember: fix(
    [Diagnostics.Module_0_declares_1_locally_but_it_is_not_exported.code],
    'fixImportNonExportedMember'
  ),

  fixMissingAttributes: fix(
    [
      Diagnostics.Property_0_does_not_exist_on_type_1.code,
      Diagnostics.Property_0_does_not_exist_on_type_1_Did_you_mean_2.code,
      Diagnostics.Property_0_is_missing_in_type_1_but_required_in_type_2.code,
      Diagnostics.Type_0_is_missing_the_following_properties_from_type_1_Colon_2.code,
      Diagnostics.Type_0_is_missing_the_following_properties_from_type_1_Colon_2_and_3_more.code,
      Diagnostics.Argument_of_type_0_is_not_assignable_to_parameter_of_type_1.code,
      Diagnostics.Cannot_find_name_0.code,
    ],
    'fixMissingAttributes'
  ),
  fixMissingMember: fix(
    [
      Diagnostics.Property_0_does_not_exist_on_type_1.code,
      Diagnostics.Property_0_does_not_exist_on_type_1_Did_you_mean_2.code,
      Diagnostics.Property_0_is_missing_in_type_1_but_required_in_type_2.code,
      Diagnostics.Type_0_is_missing_the_following_properties_from_type_1_Colon_2.code,
      Diagnostics.Type_0_is_missing_the_following_properties_from_type_1_Colon_2_and_3_more.code,
      Diagnostics.Argument_of_type_0_is_not_assignable_to_parameter_of_type_1.code,
      Diagnostics.Cannot_find_name_0.code,
    ],
    'fixMissingMember'
  ),
  fixMissingProperties: fix(
    [
      Diagnostics.Property_0_does_not_exist_on_type_1.code,
      Diagnostics.Property_0_does_not_exist_on_type_1_Did_you_mean_2.code,
      Diagnostics.Property_0_is_missing_in_type_1_but_required_in_type_2.code,
      Diagnostics.Type_0_is_missing_the_following_properties_from_type_1_Colon_2.code,
      Diagnostics.Type_0_is_missing_the_following_properties_from_type_1_Colon_2_and_3_more.code,
      Diagnostics.Argument_of_type_0_is_not_assignable_to_parameter_of_type_1.code,
      Diagnostics.Cannot_find_name_0.code,
    ],
    'fixMissingProperties'
  ),

  fixOverrideModifier: fix(
    [
      Diagnostics
        .This_member_cannot_have_an_override_modifier_because_it_is_not_declared_in_the_base_class_0
        .code,
      Diagnostics
        .This_member_cannot_have_an_override_modifier_because_its_containing_class_0_does_not_extend_another_class
        .code,
      Diagnostics
        .This_member_must_have_an_override_modifier_because_it_overrides_an_abstract_method_that_is_declared_in_the_base_class_0
        .code,
      Diagnostics
        .This_member_must_have_an_override_modifier_because_it_overrides_a_member_in_the_base_class_0
        .code,
      Diagnostics
        .This_parameter_property_must_have_an_override_modifier_because_it_overrides_a_member_in_base_class_0
        .code,
      Diagnostics
        .This_member_must_have_a_JSDoc_comment_with_an_override_tag_because_it_overrides_a_member_in_the_base_class_0
        .code,
      Diagnostics
        .This_member_cannot_have_a_JSDoc_comment_with_an_override_tag_because_its_containing_class_0_does_not_extend_another_class
        .code,
      Diagnostics
        .This_parameter_property_must_have_a_JSDoc_comment_with_an_override_tag_because_it_overrides_a_member_in_the_base_class_0
        .code,
      Diagnostics
        .This_member_cannot_have_a_JSDoc_comment_with_an_override_tag_because_it_is_not_declared_in_the_base_class_0
        .code,
    ],
    'fixOverrideModifier'
  ),
  fixReturnTypeInAsyncFunction: fix(
    [
      Diagnostics
        .The_return_type_of_an_async_function_or_method_must_be_the_global_Promise_T_type_Did_you_mean_to_write_Promise_0
        .code,
    ],
    'fixReturnTypeInAsyncFunction'
  ),
  import: fix(
    [
      Diagnostics.Cannot_find_name_0.code,
      Diagnostics.Cannot_find_name_0_Did_you_mean_1.code,
      Diagnostics.Cannot_find_name_0_Did_you_mean_the_instance_member_this_0.code,
      Diagnostics.Cannot_find_name_0_Did_you_mean_the_static_member_1_0.code,
      Diagnostics.Cannot_find_namespace_0.code,
      Diagnostics
        ._0_refers_to_a_UMD_global_but_the_current_file_is_a_module_Consider_adding_an_import_instead
        .code,
      Diagnostics._0_only_refers_to_a_type_but_is_being_used_as_a_value_here.code,
      Diagnostics
        .No_value_exists_in_scope_for_the_shorthand_property_0_Either_declare_one_or_provide_an_initializer
        .code,
      Diagnostics._0_cannot_be_used_as_a_value_because_it_was_imported_using_import_type.code,
    ],
    'import'
  ),
  inferFromUsage: fix(
    [
      // Variable declarations
      Diagnostics
        .Variable_0_implicitly_has_type_1_in_some_locations_where_its_type_cannot_be_determined
        .code,

      // Variable uses
      Diagnostics.Variable_0_implicitly_has_an_1_type.code,

      // Parameter declarations
      Diagnostics.Parameter_0_implicitly_has_an_1_type.code,
      Diagnostics.Rest_parameter_0_implicitly_has_an_any_type.code,

      // Get Accessor declarations
      Diagnostics
        .Property_0_implicitly_has_type_any_because_its_get_accessor_lacks_a_return_type_annotation
        .code,
      Diagnostics._0_which_lacks_return_type_annotation_implicitly_has_an_1_return_type.code,

      // Set Accessor declarations
      Diagnostics
        .Property_0_implicitly_has_type_any_because_its_set_accessor_lacks_a_parameter_type_annotation
        .code,

      // Property declarations
      Diagnostics.Member_0_implicitly_has_an_1_type.code,

      //// Suggestions
      // Variable declarations
      Diagnostics
        .Variable_0_implicitly_has_type_1_in_some_locations_but_a_better_type_may_be_inferred_from_usage
        .code,

      // Variable uses
      Diagnostics.Variable_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage
        .code,

      // Parameter declarations
      Diagnostics.Parameter_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage
        .code,
      Diagnostics
        .Rest_parameter_0_implicitly_has_an_any_type_but_a_better_type_may_be_inferred_from_usage
        .code,

      // Get Accessor declarations
      Diagnostics
        .Property_0_implicitly_has_type_any_but_a_better_type_for_its_get_accessor_may_be_inferred_from_usage
        .code,
      Diagnostics._0_implicitly_has_an_1_return_type_but_a_better_type_may_be_inferred_from_usage
        .code,

      // Set Accessor declarations
      Diagnostics
        .Property_0_implicitly_has_type_any_but_a_better_type_for_its_set_accessor_may_be_inferred_from_usage
        .code,

      // Property declarations
      Diagnostics.Member_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage
        .code,

      // Function expressions and declarations
      Diagnostics.this_implicitly_has_type_any_because_it_does_not_have_a_type_annotation.code,
    ],
    'inferFromUsage'
  ),
  invalidImportSyntax: fix(
    [
      Diagnostics.Argument_of_type_0_is_not_assignable_to_parameter_of_type_1.code,
      Diagnostics.Type_0_does_not_satisfy_the_constraint_1.code,
      Diagnostics.Type_0_is_not_assignable_to_type_1.code,
      Diagnostics
        .Type_0_is_not_assignable_to_type_1_Two_different_types_with_this_name_exist_but_they_are_unrelated
        .code,
      Diagnostics.Type_predicate_0_is_not_assignable_to_1.code,
      Diagnostics.Property_0_of_type_1_is_not_assignable_to_2_index_type_3.code,
      Diagnostics._0_index_type_1_is_not_assignable_to_2_index_type_3.code,
      Diagnostics.Property_0_in_type_1_is_not_assignable_to_the_same_property_in_base_type_2.code,
      Diagnostics.Property_0_in_type_1_is_not_assignable_to_type_2.code,
      Diagnostics.Property_0_of_JSX_spread_attribute_is_not_assignable_to_target_property.code,
      Diagnostics.The_this_context_of_type_0_is_not_assignable_to_method_s_this_of_type_1.code,
      Diagnostics.This_expression_is_not_callable.code,
      Diagnostics.This_expression_is_not_constructable.code,
    ],
    'invalidImportSyntax'
  ),
  jdocTypes: fix([Diagnostics.Change_0_to_1.code], 'jdocTypes'),
  removeUnnecessaryAwait: fix(
    [Diagnostics.await_has_no_effect_on_the_type_of_this_expression.code],
    'removeUnnecessaryAwait'
  ),
  requireInTs: fix([Diagnostics.require_call_may_be_converted_to_an_import.code], 'requireInTs'),
  strictClassInitialization: fix(
    [
      Diagnostics.Property_0_has_no_initializer_and_is_not_definitely_assigned_in_the_constructor
        .code,
    ],
    'strictClassInitialization'
  ),
  unusedIdentifier: fix(
    [
      Diagnostics._0_is_declared_but_its_value_is_never_read.code,
      Diagnostics._0_is_declared_but_never_used.code,
      Diagnostics.Property_0_is_declared_but_its_value_is_never_read.code,
      Diagnostics.All_imports_in_import_declaration_are_unused.code,
      Diagnostics.All_destructured_elements_are_unused.code,
      Diagnostics.All_variables_are_unused.code,
      Diagnostics.All_type_parameters_are_unused.code,
    ],
    'unusedIdentifier'
  ),
  useDefaultImport: fix(
    [Diagnostics.Import_may_be_converted_to_a_default_import.code],
    'useDefaultImport'
  ),
};
