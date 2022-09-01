import { Plugin, type PluginParams, type PluginResult } from '@rehearsal/service';
import { findNodeAtPosition } from '@rehearsal/utils';
import { codefixes, FixTransform } from '@rehearsal/transforms';

import { getFilesData } from '../data';

/**
 * Apply transforms to add types to files
 */
export class DiscoverTypesPlugin extends Plugin {
  async run(params: PluginParams<undefined>): PluginResult {
    const { fileName } = params;

    this.logger?.debug(`Plugin 'DiscoverTypes' run on ${fileName}`);

    let diagnostics = this.service.getSemanticDiagnosticsWithLocation(fileName);

    let tries = diagnostics.length + 1;

    const allFixedFiles: Set<string> = new Set();

    while (diagnostics.length > 0 && tries-- > 0) {
      const diagnostic = diagnostics.shift()!;

      const fix = codefixes.getFixForError(diagnostic.code) || new FixTransform();
      const node = findNodeAtPosition(diagnostic.file, diagnostic.start, diagnostic.length);
      const fixedFiles = fix.run(diagnostic, this.service);

      let fixed = false;

      if (fixedFiles.length > 0) {
        this.logger?.debug(` - TS${diagnostic.code} at ${diagnostic.start}:\t fix applied`);

        fixed = true;

        for (const fixedFile of fixedFiles) {
          this.service.setFileText(fixedFile.fileName, fixedFile.updatedText || 'ERROR'); // TODO: Handle the case where updatedText does not exist.
          allFixedFiles.add(fixedFile.fileName);
        }
      } else {
        this.logger?.error(
          ` - TS${diagnostic.code} at ${diagnostic.start}:\t !!! Unhandled diagnostic !!!`
        );
      }

      const processedFiles = getFilesData(fixedFiles, diagnostic, '');

      this.reporter?.addItem(diagnostic, processedFiles, fixed, node, '');

      // Get updated list of diagnostics
      diagnostics = this.service.getSemanticDiagnosticsWithLocation(params.fileName);
    }

    // const moreDiagnostics = this.service.getSemanticDiagnosticsWithLocation(fileName);

    // this.logger?.debug(`>>>>> MORE DIAGNOSTICS`);
    // moreDiagnostics.forEach((diagnostic) => {
    //   this.logger?.debug(
    //     ` - TS${diagnostic.code} at ${diagnostic.start}:\t !!! no comment added !!!`
    //   );
    // });

    return Array.from(allFixedFiles);
  }
}
