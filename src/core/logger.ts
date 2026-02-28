export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let minLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel): void {
  minLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

function formatMessage(
  level: LogLevel,
  context: string,
  message: string,
  data?: Record<string, unknown>
): string {
  const timestamp = new Date().toISOString();
  const base = JSON.stringify({
    timestamp,
    level,
    context,
    message,
    ...(data ? { data } : {}),
  });
  return base;
}

export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

export function createLogger(context: string): Logger {
  return {
    debug(message: string, data?: Record<string, unknown>): void {
      if (shouldLog('debug')) {
        process.stdout.write(formatMessage('debug', context, message, data) + '\n');
      }
    },
    info(message: string, data?: Record<string, unknown>): void {
      if (shouldLog('info')) {
        process.stdout.write(formatMessage('info', context, message, data) + '\n');
      }
    },
    warn(message: string, data?: Record<string, unknown>): void {
      if (shouldLog('warn')) {
        process.stderr.write(formatMessage('warn', context, message, data) + '\n');
      }
    },
    error(message: string, data?: Record<string, unknown>): void {
      if (shouldLog('error')) {
        process.stderr.write(formatMessage('error', context, message, data) + '\n');
      }
    },
  };
}
