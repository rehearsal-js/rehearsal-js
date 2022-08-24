import { Log, Run, ReportingDescriptor, Result, Artifact, Location, PropertyBag } from 'sarif';
import { Report, ReportItem, ProcessedFile, FileCollection } from '../types';

let ruleIndexMap: { [ruleId: string]: number } | undefined;
let rules: ReportingDescriptor[] = [];

let artifactIndexMap: { [fileName: string]: number } | undefined;
let artifacts: Artifact[] = [];

let results: Result[] = [];

export function sarifFormatter(report: Report): string {
  const run = buildRun(report);
  const log = {
    ...initLog(),
    runs: [run],
  };
  cleanUp();
  return JSON.stringify(log, null, 2);
}

function initLog(): Log {
  return {
    version: '2.1.0' as const,
    $schema: 'http://json.schemastore.org/sarif-2.1.0-rtm.4',
    runs: [],
  };
}

function buildRun(report: Report): Run {
  const run = initRun(report);

  for (const item of report.items) {
    const ruleId = `TS${item.errorCode}`;
    rules = addRule(ruleId, item.message, rules);

    artifacts = addArtifact(item.files, artifacts);

    results = addResult(item, results);
  }

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

function ruleExists(ruleId: string): boolean {
  return !!(ruleIndexMap && Object.getOwnPropertyDescriptor(ruleIndexMap, ruleId));
}

function artifactExists(artifactName: string): boolean {
  return !!(artifactIndexMap && Object.getOwnPropertyDescriptor(artifactIndexMap, artifactName));
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

function addRule(
  ruleId: string,
  message: string,
  rules: ReportingDescriptor[]
): ReportingDescriptor[] {
  if (!ruleExists(ruleId)) {
    const rule = {
      id: ruleId,
      name: ruleId,
      shortDescription: {
        text: message,
      },
      helpUri: '',
    };

    rules = [...rules, rule];

    ruleIndexMap = {
      ...(ruleIndexMap || {}),
      [ruleId]: rules.length - 1,
    };
  }
  return rules;
}

function addArtifact(files: FileCollection, artifacts: Artifact[]): Artifact[] {
  for (const file in files) {
    if (!artifactExists(file)) {
      const newArtifact = buildArtifact(files[file]);
      artifacts = [...artifacts, newArtifact];

      artifactIndexMap = {
        ...(artifactIndexMap || {}),
        [file]: artifacts.length - 1,
      };
    } else {
      const index = artifactIndexMap![file];
      const existingArtifact = artifacts[index];
      artifacts[index] = updateArtifact(existingArtifact, files[file]);
    }
  }
  return artifacts;
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

function addResult(item: ReportItem, results: Result[]): Result[] {
  const result = buildResult(item);
  return [...results, result];
}

function buildResult(item: ReportItem): Result {
  const { locations, relatedLocations, fixes } = getFilesData(item.files, item.analysisTarget);
  const baselineState = item.fixed ? 'updated' : 'unchanged';
  const kind = item.fixed ? 'review' : 'informational';
  return {
    ruleId: `TS${item.errorCode}`,
    ruleIndex: ruleIndexMap && ruleIndexMap[`TS${item.errorCode}`],
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

function getFilesData(files: FileCollection, entryFileName: string): PropertyBag {
  let locations: Location[] = [];
  let relatedLocations: Location[] = [];

  let fixes: { [key: string]: string | undefined }[] = [];
  Object.values(files).forEach((file) => {
    if (file.fileName === entryFileName) {
      locations = [...locations, buildLocation(file)];
    } else {
      relatedLocations = [...relatedLocations, buildLocation(file)];
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

function buildLocation(file: ProcessedFile): Location {
  const index = artifactIndexMap && artifactIndexMap[file.fileName];
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

function initRun(report: Report): Run {
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

function cleanUp(): void {
  ruleIndexMap = undefined;
  rules = [];

  artifactIndexMap = undefined;
  artifacts = [];

  results = [];
}
