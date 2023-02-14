import { type Report } from '../../../src';

const initialData: Report = {
  summary: [{
    projectName: "@rehearsal/test",
    tsVersion: "4.7.4",
    timestamp: "9/16/2022, 20:16:50",
    basePath: "/reporter/test/sarif-formatter",
    commandName: "@rehearsal/reporter",
    entrypoint: "",
  }],
  items: [],
  fixedItemCount: 0
};

export { initialData };
