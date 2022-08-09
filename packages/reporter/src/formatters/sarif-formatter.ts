import { Log, Run, ReportingDescriptor, Result, Artifact } from 'sarif';
import { Report, ReportItem, ProcessedFile, FileCollection } from '../types';

let ruleIndexMap: {[ruleId: string]: number} | undefined;
let rules: ReportingDescriptor[] = [];

let artifactIndexMap: {[fileName: string]: number} | undefined;
let artifacts: Artifact[] = [];

let results: Result[] = [];

export function sarifFormatter(report: Report): string {
  const run = buildRun(report.items);
  const log = {
    ...initLog(),
    runs: [run]
  };
  cleanUp();
  return JSON.stringify(log, null, 2);
}

function initLog(): Log {
  return {
    version: "2.1.0" as "2.1.0",
    $schema: "http://json.schemastore.org/sarif-2.1.0-rtm.4",
    runs: []
  };
}

function buildRun(items: ReportItem[]): Run{
  let run = initRun();

  for(const item of items) {
    const ruleId = `TS${item.errorCode}`;
    rules = addRule(ruleId, item.message, rules);

    artifacts = addArtifact(item.files, artifacts);

    results = addResult(item, results); 
  }

  const tool = {
    ...run.tool,
    driver: {
      ...run.tool.driver,
      rules
    }
  };

  return {
    ...run,
    tool,
    artifacts,
    results,
  };
}

function ruleExists(ruleId: string): boolean {
  return !!(ruleIndexMap && ruleIndexMap.hasOwnProperty(ruleId));
}

function artifactExists(artifactName: string): boolean {
  return !!(artifactIndexMap && artifactIndexMap.hasOwnProperty(artifactName));
}

function updateArtifact(artifact: Artifact, file: ProcessedFile): Artifact {
  artifact.roles = Array.from(new Set(artifact.roles?.concat(file.roles))); // TODO: fix 'modified'/'unmodified'
  artifact.properties!.fixed = file.fixed ?? artifact.properties!.fixed;
  artifact.properties!.hintAdded = file.hintAdded ?? artifact.properties!.hintAdded;
  return artifact;
}

function addRule(ruleId: string, message: string, rules: ReportingDescriptor[]): ReportingDescriptor[]{
  if(!ruleExists(ruleId)) {
    const rule = {
      id: ruleId,
      shortDescription: {
        text: message,
      },
      helpUri: ''
    };

    rules = [...rules, rule];

    ruleIndexMap = {
      ...(ruleIndexMap || {}),
      [ruleId]: rules.length - 1
    };
  }
  return rules;
}

function addArtifact(files: FileCollection, artifacts: Artifact[]): Artifact[]{
  for(const file in files){
    if(!artifactExists(file)) {
      const newArtifact = buildArtifact(files[file]);
      artifacts = [ ...artifacts, newArtifact ];

      artifactIndexMap = {
        ...(artifactIndexMap || {}),
        [file]: artifacts.length - 1
      };
    } else {
      const index = artifactIndexMap![file];
      let existingArtifact = artifacts[index];
      artifacts[index] = updateArtifact(existingArtifact, files[file]);
    }
  }
  return artifacts;
}

function buildArtifact(file: ProcessedFile): Artifact {
  return {
    location: {
      uri: file.fileName
    },
    roles: file.roles,
    properties: {
      fixed: file.fixed,
      hintAdded: file.hintAdded,
    }
  };
}

function addResult(item: ReportItem, results: Result[]) {
  const result = buildResult(item);
  return [ ...results, result ];
}

function buildResult(item: ReportItem): Result {
  const locations = Object.values(item.files).map((file) => ({
    physicalLocation: {
      artifactLocation: {
        uri: file.fileName
      },
      region: {
        startLine: file.location?.line,
        startColumn: file.location?.character
      }
    }
  }));
  return {
    ruleId: `TS${item.errorCode}`,
    ruleIndex: ruleIndexMap && ruleIndexMap[`TS${item.errorCode}`],
    level: levelConverter(item.category),
    message: {
      text: item.hint,
    },
    analysisTarget: {
      uri: item.analysisTarget,
    },
    locations
  };
}

function levelConverter(category: string): Result.level {
  switch(category) {
    case 'Warning': 
    return 'warning';
    case "Error":
      return 'error';
    case "Suggestion":
      return 'note';
    case "Message":
      return 'note';
    default:
      return 'none';
  }
}

function initRun(): Run {
  return {
    tool: {
      driver: {
        name: '@rehearsal/migrate',
        informationUri: 'https://github.com/rehearsal-js/rehearsal-js',
        rules: []
      }
    },
    artifacts: [],
    results: []
  }
}

function cleanUp(): void {
  ruleIndexMap = undefined;
  rules = [];

  artifactIndexMap = undefined;
  artifacts = [];

  results = [];
}




