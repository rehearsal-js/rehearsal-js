export type LogMessage = {
  severity: 'error' | 'warn' | 'log';
  message: string;
};

export class Logger {
  #logs: Array<LogMessage>;

  constructor() {
    this.#logs = new Array<LogMessage>();
  }

  get entries(): Array<LogMessage> {
    return this.#logs;
  }

  error(message: string): void {
    this.#logs.push({ severity: 'error', message });
  }

  warn(message: string): void {
    this.#logs.push({ severity: 'warn', message });
  }

  log(message: string): void {
    this.#logs.push({ severity: 'log', message });
  }
}

// Module scoped logger;
const logger: Logger = new Logger();

export function getLogger(): Logger {
  return logger;
}
