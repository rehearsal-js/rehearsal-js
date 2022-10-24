import { Log } from 'sarif';

const resultsData: Log = {
  version: "2.1.0",
  $schema: "http://json.schemastore.org/sarif-2.1.0-rtm.4",
  runs: [
    {
      tool: {
        driver: {
          name: "@rehearsal/upgrade",
          informationUri: "https://github.com/rehearsal-js/rehearsal-js",
          rules: [
            {
              id: "TS6133",
              name: "TS6133",
              shortDescription: {
                text: "'react' is declared but its value is never read."
              },
              helpUri: ""
            },
            {
              id: "TS2322",
              name: "TS2322",
              shortDescription: {
                text: "Type 'string' is not assignable to type 'number'."
              },
              helpUri: ""
            },
            {
              id: "TS2345",
              name: "TS2345",
              shortDescription: {
                text: "Argument of type '{}' is not assignable to parameter of type 'string'."
              },
              helpUri: ""
            }
          ]
        }
      },
      artifacts: [
        {
          location: {
            uri: "add-result-1.ts"
          },
          roles: [
            "analysisTarget",
            "modified"
          ],
          properties: {
            fixed: true,
            hintAdded: true
          }
        }
      ],
      results: [
        {
          ruleId: "TS6133",
          ruleIndex: 0,
          level: "error",
          baselineState: "updated",
          kind: "review",
          message: {
            text: "The declaration 'react' is never read or used. Remove the declaration or use it."
          },
          analysisTarget: {
            uri: "add-result-1.ts"
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: "add-result-1.ts",
                  index: 0
                },
                region: {
                  startLine: 1,
                  startColumn: 1,
                  endLine: 1,
                  endColumn: 1
                },
                properties: {
                  code: "import react from 'react';",
                  codeFixAction: "delete",
                  roles: [
                    "analysisTarget",
                    "modified"
                  ]
                }
              }
            }
          ],
          relatedLocations: [],
          properties: {
            fixed: true,
            fixes: [
              {
                fileName: "add-result-1.ts",
                code: "import react from 'react';",
                codeFixAction: "delete"
              }
            ]
          }
        },
        {
          ruleId: "TS2322",
          ruleIndex: 1,
          level: "error",
          baselineState: "unchanged",
          kind: "informational",
          message: {
            text: ""
          },
          analysisTarget: {
            uri: "add-result-1.ts"
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: "",
                  index: 0
                },
                properties: {
                  code: "",
                  roles: [
                    "analysisTarget",
                    "unmodified"
                  ]
                }
              }
            }
          ],
          relatedLocations: [],
          properties: {
            fixed: false,
            fixes: []
          }
        },
        {
          ruleId: "TS2345",
          ruleIndex: 2,
          level: "error",
          baselineState: "unchanged",
          kind: "informational",
          message: {
            text: "Argument of type '{0}' is not assignable to parameter of type 'string'. Consider verifying both types, using type assertion: '({} as string)', or using type guard: 'if ({} instanceof string) { ... }'."
          },
          analysisTarget: {
            uri: "add-result-1.ts"
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: "add-result-1.ts",
                  index: 0
                },
                region: {
                  startLine: 10,
                  startColumn: 1,
                  endLine: 10,
                  endColumn: 5
                },
                properties: {
                  code: "",
                  roles: [
                    "analysisTarget",
                    "unmodified"
                  ]
                }
              }
            }
          ],
          relatedLocations: [],
          properties: {
            fixed: false,
            fixes: []
          }
        }
      ],
      automationDetails: {
        description: {
          text: "This is the run of @rehearsal/upgrade on your product against TypeScript 4.7.4 at 9/16/2022, 13:24:57"
        }
      }
    }
  ]
};

export { resultsData };