import { Log, Run, ReportingDescriptor, Result, Artifact } from 'sarif';
import { Report, ReportItem } from '../types';

function initReport(): Log{
  return {
    version: "2.1.0" as "2.1.0",
    $schema: "http://json.schemastore.org/sarif-2.1.0-rtm.4",
    runs: [],
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

function buildRule(item: ReportItem): ReportingDescriptor{
  return {
    id: 'TS' + item.code,
    shortDescription: {
      text: item.message
    },
    // helpUri: item.helpUri
  }
}

function buildArtifact(item: ReportItem, existingArtifacts: Artifact[]) {
  console.log('artifacts-------------------------', existingArtifacts);
  console.log('item-------------------', item);
  let processedFiles: Artifact[] = [];
  const analysisTarget = {
    location: {
      uri: item.analysisTarget
    },
    roles: ['analysisTarget'],
    properties: {
      codemod: item.fixedFiles
    }
  }
  item.files.forEach((file) => {
    const existingArtifact = existingArtifacts.find((artifact) => 
      artifact.location!.uri === file.fileName
    );
    console.log('existingArtifact', existingArtifact);

    if (existingArtifact){
      if(!existingArtifact.roles!.includes(file.role)) {
        existingArtifact.roles = [...existingArtifact.roles!, file.role];
      }
      if(existingArtifact.properties!.codemod === false && file.codemod === true) {
        existingArtifact.properties!.codemod = true;
      }
      if(existingArtifact.properties!.commentAdded === false && file.commentAdded === true) {
        existingArtifact.properties!.commentAdded = true;
      }
    } else {
      processedFiles.push({
        location: {
          uri: file.fileName
        },
        roles: [ file.role ],
        properties: {
          codemod: file.codemod,
          commentAdded: file.commentAdded,
        }
      })
    }
  });
  return processedFiles;
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

function buildResult(item: ReportItem, ruleIndex: number) {
  const primaryFile = item.files.find((file) => file.role === 'analysisTarget');
  const locations = item.files.map((file) => ({
    physicalLocation: {
      artifactLocation: {
        uri: file.fileName
      },
      region: {
        startLine: item.location.line,
        startColumn:item.location.start, 
      }
    }
  }))
  return {
    ruleId: 'TS' + item.code,
    ruleIndex,
    level: levelConverter(item.category),
    message: {
      text: item.hint,
    },
    analysisTarget: {
      uri: primaryFile?.fileName
    },
    // kind: 'fail' as 'fail', //'notApplicable'| 'pass' | 'fail' | 'review' | 'open' | 'informational'
    locations
      // {
      //   physicalLocation: {
      //     artifactLocation: {
      //       uri: item.file
      //     },
      //     region: {
      //       startLine: item.location.line,
      //       startColumn: item.location.start
      //     }
      //   },
      //   relationships: [
      //     {
      //       kinds: ['importedFrom'],
      //       target: 1,
      //     }
      //   ]
      // },
  }
}

function createRun(items: ReportItem[]): Run{
  let run = initRun();
  for(const item of items) {
    run.tool.driver.rules!.push(buildRule(item));
    const artifact = buildArtifact(item, run.artifacts!);
    if(artifact) {
      run.artifacts! = [...run.artifacts!, ...artifact ]
    }
    // artifact && run.artifacts!.concat(artifact);
    run.results!.push(buildResult(item, run.tool.driver.rules!.length - 1))
  }
  return run;

}
export function sarifFormatter(data: Report): string {
  let report = initReport();
  if(!data || !data.items) {
    return JSON.stringify(report, null, 2);
  }
  const run = createRun(data.items);
  report.runs.push(run);
  return JSON.stringify(report, null, 2);
}