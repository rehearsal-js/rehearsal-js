import { Artifact, Location, Log, ReportingDescriptor, Result, Run } from 'sarif';

import { Report, ReportItem } from '../types';

export class SarifFormatter {
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
    return JSON.stringify(this.buildLog(), null, 2);
  }

  buildLog(): Log {
    const runs = this.buildRun();

    return {
      version: '2.1.0' as const,
      $schema: 'http://json.schemastore.org/sarif-2.1.0-rtm.4',
      runs: Array.isArray(runs) ? runs : [runs],
    };
  }

  private buildRun(): Run {
    const run = createRun(this.report);

    for (const item of this.report.items) {
      const ruleId = `TS${item.errorCode}`;
      this.addRule(ruleId, item.message);
      this.addArtifact(item.analysisTarget);
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

  private addArtifact(fileName: string): void {
    if (!this.artifactExists(fileName)) {
      const newArtifact = buildArtifact(fileName);
      this.artifacts.push(newArtifact);

      this.artifactIndexMap[fileName] = this.artifacts.length - 1;
    }
  }

  private addResult(item: ReportItem): void {
    this.results.push(this.buildResult(item));
  }

  private buildResult(item: ReportItem): Result {
    const location = this.buildLocation(item);
    return {
      ruleId: `TS${item.errorCode}`,
      ruleIndex: this.ruleIndexMap[`TS${item.errorCode}`],
      level: levelConverter(item.category),
      kind: kindConverter(item.category),
      message: {
        text: item.hint,
      },
      analysisTarget: {
        uri: item.analysisTarget,
      },
      locations: [location],
    };
  }

  private buildLocation(item: ReportItem): Location {
    const index = this.artifactIndexMap[item.analysisTarget];
    return {
      physicalLocation: {
        artifactLocation: {
          uri: item.analysisTarget,
          index,
        },
        region: {
          startLine: item.nodeLocation?.startLine,
          startColumn: item.nodeLocation?.startColumn,
          endLine: item.nodeLocation?.endLine,
          endColumn: item.nodeLocation?.endColumn,
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

function buildArtifact(fileName: string): Artifact {
  return {
    location: {
      uri: fileName,
    },
  };
}
function kindConverter(category: string): Result.kind {
  switch (category) {
    case 'Warning':
    case 'Suggestion':
    case 'Message':
      return 'review';
    default:
      return 'fail';
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

function createRun(report: Report): Run {
  return {
    tool: {
      driver: {
        name: `${report.summary.commandName}`,
        informationUri: 'https://github.com/rehearsal-js/rehearsal-js',
        rules: [],
      },
    },
    artifacts: [],
    results: [],
    automationDetails: {
      description: {
        text: `This is the run of ${report.summary.commandName} on your product against TypeScript ${report.summary.tsVersion} at ${report.summary.timestamp}`,
      },
    },
  };
}

export function sarifFormatter(report: Report): string {
  const formatter = new SarifFormatter(report);
  return formatter.format();
}
