// Run listr task(s) with a givin context and return the final context
import { ListrBaseClassOptions, Manager, ListrTask } from 'listr2';

import { MigrateCommandContext } from '../../src/types';

function TaskManagerFactory<T>(override?: ListrBaseClassOptions): Manager<T> {
  const defaultOptions: ListrBaseClassOptions = {
    concurrent: false,
    exitOnError: true,
    rendererOptions: {
      collapse: false,
      collapseSkips: false,
    },
  };

  return new Manager({ ...defaultOptions, ...override });
}

export class ListrTaskRunner {
  private tasks = TaskManagerFactory<MigrateCommandContext>();

  constructor(tasks: ListrTask[], ctx?: MigrateCommandContext) {
    if (ctx) {
      this.tasks.ctx = ctx;
    }
    this.tasks.add(tasks);
  }

  public async run(): Promise<MigrateCommandContext> {
    return await this.tasks.runAll();
  }
}
