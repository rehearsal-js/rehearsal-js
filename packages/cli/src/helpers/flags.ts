/*
! ALL VARIABLES NAMES HERE MUST BE CASED UNDERSCORE AND NOT CAMEL FOR THE CLI
*/

// import { Flags } from '@oclif/core';
// import { isValidSemver } from '../../src';

// export const build = Flags.build({
//   char: 'b',
//   description: 'typescript build variant',
//   options: ['beta', 'next', 'latest'],
// });

// export const src_dir = Flags.build({
//   char: 's',
//   description: 'typescript source directory',
// });

// export const is_test = Flags.boolean({
//   hidden: true,
// });

// export const autofix = Flags.boolean({
//   char: 'a',
//   description: 'autofix tsc errors where available',
// });

// export const dry_run = Flags.boolean({
//   char: 'd',
//   description: 'dry run. dont commit any changes. reporting only.',
// });

// export const tsc_version = Flags.build({
//   char: 't',
//   description: 'override the build variant by specifying the typescript compiler version as n.n.n',
//   parse: async (input: string): Promise<string> => {
//     if (await isValidSemver(input)) {
//       throw new Error(
//         'The tsc_version specified is an invalid string. Please specify a valid version as n.n.n'
//       );
//     } else {
//       return input;
//     }
//   },
// });

// export const report_output = Flags.build({
//   description: 'set the directory for the report output',
// });
