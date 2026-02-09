/* Each level includes the one before it, ie error includes verbose and debug logs */
export enum LogLevel {
    // dev
    ON, // everything
    VERBOSE, // usually for features that are actively in development/testing, goal is to catch unforeseen errors when they come up without having to repro
    DEBUG, // only more crucial debug stuff

    // prod
    ERROR, // only start message, crash messages, etc
    OFF // nothing
}

class Logger {

    constructor(private level: LogLevel) { }

    setLogLevel(level: LogLevel) { this.level = level; }

    write(minimumLogLevel: LogLevel, code: string, data: any[]): void {
        if (this.level == LogLevel.OFF) { return; }
        if (minimumLogLevel >= this.level) {
            console.log(`[${new Date().toISOString()}]${code ? '[' + code + ']' : ''}`, data.join().split(',').join(' '));
        }
    }
}

const logger = new Logger(LogLevel.ON);

export const log = (level: LogLevel, code: string, ...data: any[]) => {
    logger.write(level, code, data);
}
