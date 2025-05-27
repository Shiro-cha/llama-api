export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogEntry {
  timestamp: string
  level: string
  message: string
  context?: Record<string, any>
  error?: Error
}

export class Logger {
  private static instance: Logger
  private logLevel: LogLevel

  private constructor() {
    this.logLevel = this.parseLogLevel(process.env.LOG_LEVEL || "info")
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case "error":
        return LogLevel.ERROR
      case "warn":
        return LogLevel.WARN
      case "info":
        return LogLevel.INFO
      case "debug":
        return LogLevel.DEBUG
      default:
        return LogLevel.INFO
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel
  }

  private formatLog(level: string, message: string, context?: Record<string, any>, error?: Error): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
    }
  }

  private output(logEntry: LogEntry): void {
    const output = JSON.stringify(logEntry, null, 2)
    console.log(output)
  }

  error(message: string, context?: Record<string, any>, error?: Error): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.output(this.formatLog("ERROR", message, context, error))
    }
  }

  warn(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.output(this.formatLog("WARN", message, context))
    }
  }

  info(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.output(this.formatLog("INFO", message, context))
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.output(this.formatLog("DEBUG", message, context))
    }
  }
}
