export enum LogLevel {
  None = 0,
  Error = 1,
  Warn = 2,
  Info = 3,
  Debug = 4,
}

export const logLevelMap: Record<string, LogLevel> = {
  none: LogLevel.None,
  error: LogLevel.Error,
  warn: LogLevel.Warn,
  info: LogLevel.Info,
  debug: LogLevel.Debug,
};

export const logLevelName = (Deno.env.get("LOG_LEVEL") ?? "info").toLowerCase();
export const logLevelValue = logLevelMap[logLevelName];

if (logLevelValue === undefined) {
  throw new Error(`Invalid LOG_LEVEL value: ${logLevelName}. Valid values are: ${Object.keys(logLevelMap).join(", ")}`);
}

export class Logger {
  constructor(private log: (...args: unknown[]) => void, public level: LogLevel) {}
  get debug() {
    return this.level >= LogLevel.Debug ? this.log : undefined;
  }
  get info() {
    return this.level >= LogLevel.Info ? this.log : undefined;
  }
  get warn() {
    return this.level >= LogLevel.Warn ? this.log : undefined;
  }
  get error() {
    return this.level >= LogLevel.Error ? this.log : undefined;
  }
  prefixed(...args: unknown[]) {
    return new Logger(this.log.bind(this, ...args), this.level);
  }
  transform(fn: (log: (...args: unknown[]) => void) => (...args: unknown[]) => void) {
    return new Logger(fn(this.log), this.level);
  }
}

export const DefaultLogger = new Logger(console.error.bind(console), logLevelValue);
export const DefaultLoggerWithTimestamp = DefaultLogger.transform((log) => (...args: unknown[]) => {
  return log(new Date().toISOString(), ...args);
});
