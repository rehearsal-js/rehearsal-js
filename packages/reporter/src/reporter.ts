import { existsSync, readFileSync, writeFileSync } from 'fs';
import {
  type DiagnosticMessageChain,
  DiagnosticCategory,
  flattenDiagnosticMessageText,
  version,
} from 'typescript';
import { type ProcessedFile, type ReportFormatter, type Report, LocAndFixes } from './types';
import type { DiagnosticWithLocation, Node } from 'typescript';
import type { Logger } from 'winston';
import type { Result, Location, ArtifactChange, Replacement } from 'sarif';

interface ResultArgs {
  errorCode: string;
  hint: string;
  files: { [fileName: string]: ProcessedFile };
  fixed: boolean;
  diagnostic: DiagnosticWithLocation;
  node?: Node;
}

/**
 * Representation of diagnostic and migration report.
 */
export class Reporter {
  readonly basePath: string;

  public report: Report;
  private logger?: Logger;
  private ruleIndexMap: { [ruleId: string]: number } = {};
  private artifactIndexMap: { [fileName: string]: number } = {};

  constructor(projectName = '', basePath = '', logger?: Logger) {
    this.basePath = basePath;
    this.logger = logger?.child({ service: 'rehearsal-reporter' });

    this.report = {
      tool: {
        driver: {
          name: '@rehearsal/upgrade',
          informationUri: 'https://github.com/rehearsal-js/rehearsal-js',
          rules: [],
          properties: {
            tsVersion: version,
            projectName: projectName,
            basePath,
            timestamp: new Date().toLocaleString('en-US', {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
              hourCycle: 'h24',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
          },
        },
      },
      artifacts: [],
      results: [],
    };

    this.report.automationDetails = {
      description: {
        text:
          'This is the run of @rehearsal/upgrade on your product against TypeScript ' +
          this.report.properties?.tsVersion +
          ' at ' +
          this.report.properties?.timestamp,
      },
    };
  }

  /**
   * Appends an element to the summary
   */
  addSummary(key: string, value: unknown): void {
    if (this.report.tool.driver.properties) {
      this.report.tool.driver.properties[key] = value;
    }
  }

  /**
   * Appends am information about provided diagnostic and related node to the report
   */
  addItem(
    diagnostic: DiagnosticWithLocation,
    files: { [fileName: string]: ProcessedFile },
    fixed: boolean,
    node?: Node,
    hint = '',
    helpUrl = ''
  ): void {
    const errorCode = `TS${diagnostic.code}`;

    this.pushRule(errorCode, diagnostic.messageText);
    this.pushArtifact(files);
    this.pushResult({
      errorCode,
      hint,
      files,
      diagnostic,
      fixed,
      node,
    });
  }

  private pushResult(resultArgs: ResultArgs): void {
    const { files, errorCode, diagnostic, fixed, hint, node } = resultArgs;
    const { locations, relatedLocations, fixes } = this.getLocsAndFixes(files, diagnostic, node);

    this.report.results.push({
      ruleId: errorCode,
      ruleIndex: this.ruleIndexMap[errorCode],
      level: levelConverter(DiagnosticCategory[diagnostic.category]),
      baselineState: fixed ? 'updated' : 'unchanged',
      kind: fixed ? 'review' : 'informational',
      message: {
        text: hint,
      },
      analysisTarget: {
        uri: diagnostic.file.fileName,
      },
      locations,
      relatedLocations,

      fixes: [{ artifactChanges: fixes }],
      properties: {
        fixed: fixed || false,
        fixes,
      },
    });
  }

  private pushArtifact(files: { [fileName: string]: ProcessedFile }): void {
    Object.entries(files).forEach(([fileName, entry]) => {
      if (this.artifactIndexMap[fileName] !== undefined) {
        const artifact = this.report.artifacts[this.artifactIndexMap[fileName]];
        let roles = Array.from(new Set(artifact.roles?.concat(entry.roles)));

        if (roles.includes('modified') && roles.includes('unmodified')) {
          roles = roles.filter((role) => role !== 'unmodified');
        }

        entry.hintAdded;
        artifact.roles = roles;
        if (artifact.properties) {
          artifact.properties.fixed = entry.fixed || artifact.properties.fixed;
          artifact.properties.hintAdded = entry.hintAdded || artifact.properties.hintAdded;
        }
      } else {
        this.artifactIndexMap[fileName] =
          this.report.artifacts.push({
            location: {
              uri: fileName,
            },
            roles: entry.roles,
            properties: {
              fixed: entry.fixed,
              hintAdded: entry.hintAdded,
            },
          }) - 1;
      }
    });
  }

  private pushRule(errorCode: string, messageText: string | DiagnosticMessageChain): void {
    this.ruleIndexMap[errorCode] =
      this.report.tool.driver.rules.push({
        id: errorCode,
        name: errorCode,
        shortDescription: {
          text: flattenDiagnosticMessageText(messageText, '. '),
        },
        helpUri: '',
      }) - 1;
  }

  private getLocsAndFixes(
    files: { [fileName: string]: ProcessedFile },
    diagnostic: DiagnosticWithLocation,
    node?: Node
  ): LocAndFixes {
    let locations: Location[] = [];
    let relatedLocations: Location[] = [];

    let fixes: ArtifactChange[] = [];
    Object.values(files).forEach((file) => {
      if (file.fileName === diagnostic.file.fileName) {
        locations = [...locations, this.buildLocation(file)];
      } else {
        relatedLocations = [...relatedLocations, this.buildLocation(file)];
      }
      if (file.fixed) {
        const replacements = this.getReplacements(file, diagnostic, node);

        fixes = [
          ...fixes,
          {
            artifactLocation: {
              uri: file.fileName,
            },
            replacements,
            // TODO are these needed
            // code: file.code || undefined,
            // codeFixAction: file.codeFixAction || undefined,
          },
        ];
      }
    });

    return {
      locations,
      relatedLocations,
      fixes,
    };
  }

  private getReplacements(
    file: ProcessedFile,
    diagnostic: DiagnosticWithLocation,
    node?: Node
  ): Replacement[] {
    const { line: startLine, character: startColumn } =
      diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    const { line: endLine, character: endColumn } = diagnostic.file.getLineAndCharacterOfPosition(
      diagnostic.start + diagnostic.length - 1
    );

    if (file.codeFixAction === 'delete') {
      return [
        {
          deletedRegion: {
            startLine,
            startColumn,
            endLine,
            endColumn,
          },
        },
      ];
    } else {
      return [
        {
          deletedRegion: {
            startLine,
            startColumn,
            endLine,
            endColumn,
          },
          insertedContent: {
            text: node?.getText(),
          },
        },
      ];
    }
  }

  private buildLocation(file: ProcessedFile): Location {
    const index = this.artifactIndexMap[file.fileName];
    return {
      physicalLocation: {
        artifactLocation: {
          uri: file.fileName,
          index,
        },
        region: {
          startLine: file.location.startLine,
          startColumn: file.location.startColumn,
          endLine: file.location.endLine,
          endColumn: file.location.endColumn,
        },
        properties: {
          code: file.code,
          codeFixAction: file.codeFixAction,
          roles: file.roles,
        },
      },
    };
  }

  /**
   * Prints the current report using provided formatter (ex. json, pull-request etc.)
   */
  print(file: string, formatter: ReportFormatter): string {
    const report = formatter(this.report);

    if (file) {
      writeFileSync(file, report);
    }

    return report;
  }

  /**
   * Saves the current report information to the file in simple JSON format
   * to be able to load it later with 'load' function
   */
  save(file: string): void {
    this.print(file, (report: Report): string => JSON.stringify(report, null, 2));
    this.logger?.info(`Report saved to: ${file}.`);
  }

  /**
   * Loads the report exported by function 'save' from the file
   */
  load(file: string): Reporter {
    if (!existsSync(file)) {
      this.logger?.error(`Report file not found: ${file}.`);
    }

    this.logger?.info(`Report file found: ${file}.`);
    const content = readFileSync(file, 'utf-8');
    const report: Report = JSON.parse(content);

    if (!Reporter.isReport(report)) {
      this.logger?.error(`Report not loaded: wrong file format`);
      return this;
    }

    this.report = report as Report;
    this.logger?.info(`Report loaded from file.`);

    return this;
  }

  toJSON(): Report {
    return this.report;
  }

  private static isReport(report: Report): report is Report {
    return report && report.artifacts !== undefined && report.tool !== undefined;
  }
}

function levelConverter(category: string): Result.level {
  switch (category) {
    case 'Warning':
      return 'warning';
    case 'Error':
      return 'error';
    case 'Suggestion':
      return 'note';
    case 'Message':
      return 'note';
    default:
      return 'none';
  }
}

function onlyReplacements(replacement: Replacement | undefined): replacement is Replacement {
  return !!replacement;
}
