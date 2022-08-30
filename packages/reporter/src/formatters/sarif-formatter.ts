import { Log, Run, ReportingDescriptor, Result, Artifact, Location, PropertyBag } from 'sarif';
import { Report, ReportItem, ProcessedFile, FileCollection } from '../types';

class SarifFormatter {
  private report: Report;
  private rules: ReportingDescriptor[] = [];
  private ruleIndexMap: { [ruleId: string]: number } = {};
  private artifactIndexMap: { [fileName: string]: number } = {};
  private artifacts: Artifact[] = [];
  private results: Result[] = [];

  constructor(report: Report) {
    this.report = report;
  }

  format(): string {
    return JSON.stringify(buildLog(this.buildRun()), null, 2);
  }

  private buildRun(): Run {
    const run = createRun(this.report);

    for (const item of this.report.items) {
      const ruleId = `TS${item.errorCode}`;
      this.addRule(ruleId, item.message);
      this.addArtifact(item.files);
      this.addResult(item);
    }

    const { rules, artifacts, results } = this;

    const tool = {
      ...run.tool,
      driver: {
        ...run.tool.driver,
        rules,
      },
    };

    return {
      ...run,
      tool,
      artifacts,
      results,
    };
  }

  private addRule(ruleId: string, message: string): void {
    if (!this.ruleExists(ruleId)) {
      const rule = {
        id: ruleId,
        name: ruleId,
        shortDescription: {
          text: message,
        },
        helpUri: '',
      };

      this.rules.push(rule);

      this.ruleIndexMap[ruleId] = this.rules.length - 1;
    }
  }

  private addArtifact(files: FileCollection): void {
    for (const file in files) {
      if (!this.artifactExists(file)) {
        const newArtifact = buildArtifact(files[file]);
        this.artifacts.push(newArtifact);

        this.artifactIndexMap[file] = this.artifacts.length - 1;
      } else {
        const index = this.artifactIndexMap![file];
        const existingArtifact = this.artifacts[index];
        this.artifacts[index] = updateArtifact(existingArtifact, files[file]);
      }
    }
  }

  private addResult(item: ReportItem): void {
    this.results.push(this.buildResult(item));
  }

  private buildResult(item: ReportItem): Result {
    const { locations, relatedLocations, fixes } = this.getFilesData(
      item.files,
      item.analysisTarget
    );
    const baselineState = item.fixed ? 'updated' : 'unchanged';
    const kind = item.fixed ? 'review' : 'informational';
    return {
      ruleId: `TS${item.errorCode}`,
      ruleIndex: this.ruleIndexMap[`TS${item.errorCode}`],
      level: levelConverter(item.category),
      baselineState,
      kind,
      message: {
        text: item.hint,
      },
      analysisTarget: {
        uri: item.analysisTarget,
      },
      locations,
      relatedLocations,
      properties: {
        fixed: item.fixed || false,
        fixes,
      },
    };
  }

  private getFilesData(files: FileCollection, entryFileName: string): PropertyBag {
    let locations: Location[] = [];
    let relatedLocations: Location[] = [];

    let fixes: { [key: string]: string | undefined }[] = [];
    Object.values(files).forEach((file) => {
      if (file.fileName === entryFileName) {
        locations = [...locations, this.buildLocation(file)];
      } else {
        relatedLocations = [...relatedLocations, this.buildLocation(file)];
      }
      if (file.fixed) {
        fixes = [
          ...fixes,
          {
            fileName: file.fileName,
            code: file.code || undefined,
            codeFixAction: file.codeFixAction || undefined,
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

  private buildLocation(file: ProcessedFile): Location {
    const index = this.artifactIndexMap[file.fileName];
    return {
      physicalLocation: {
        artifactLocation: {
          uri: file.fileName,
          index,
        },
        region: {
          startLine: file.location?.line,
          startColumn: file.location?.character,
        },
        properties: {
          code: file.code,
          codeFixAction: file.codeFixAction,
          roles: file.roles,
        },
      },
    };
  }

  private ruleExists(ruleId: string): boolean {
    return this.ruleIndexMap[ruleId] !== undefined;
  }

  private artifactExists(artifactName: string): boolean {
    return this.artifactIndexMap[artifactName] !== undefined;
  }
}

function buildLog(runs: Run | Run[]): Log {
  return {
    version: '2.1.0' as const,
    $schema: 'http://json.schemastore.org/sarif-2.1.0-rtm.4',
    runs: Array.isArray(runs) ? runs : [runs],
  };
}

function updateArtifact(artifact: Artifact, file: ProcessedFile): Artifact {
  let roles = Array.from(new Set(artifact.roles?.concat(file.roles)));
  if (roles.includes('modified') && roles.includes('unmodified')) {
    roles = roles.filter((role) => role !== 'unmodified');
  }
  artifact.roles = roles;
  artifact.properties!.fixed = file.fixed || artifact.properties!.fixed;
  artifact.properties!.hintAdded = file.hintAdded || artifact.properties!.hintAdded;
  return artifact;
}

function buildArtifact(file: ProcessedFile): Artifact {
  return {
    location: {
      uri: file.fileName,
    },
    roles: file.roles,
    properties: {
      fixed: file.fixed,
      hintAdded: file.hintAdded,
    },
  };
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

function createRun(report: Report): Run {
  return {
    tool: {
      driver: {
        name: '@rehearsal/upgrade',
        informationUri: 'https://github.com/rehearsal-js/rehearsal-js',
        rules: [],
      },
    },
    artifacts: [],
    results: [],
    automationDetails: {
      description: {
        text:
          'This is the run of @rehearsal/upgrade on your product against TypeScript ' +
          report.summary.tsVersion +
          ' at ' +
          report.summary.timestamp,
      },
    },
  };
}

export function sarifFormatter(report: Report): string {
  const formatter = new SarifFormatter(report);
  return formatter.format();
}
