import * as Logger from 'bunyan';
import { LogLevel } from 'bunyan';
import { LogOptions } from './interfaces';
/**
 * Provides a configured singleton instance of the `bunyan` logger.
 */
declare class BunyanProvider {
    /**
     * Create an return a 'child' logger of the root Bunyan logger. The root logger
     * is created on the first call to `getLogger` using the current set configuration.
     * Subsequent calls to `configure` will be ignored.
     *
     * @param logOptions The source name and log level for the child logger
     */
    static getLogger(logOptions: LogOptions): Logger;
    /**
     * Set the `bunyan` configuration. This may be called multiple times,
     * with each call replacing the previously set configuration. However
     * after the first call to `getLogger` the root logger will be created
     * and further calls to `configure` will be ignore, with a logged warning.
     *
     * @param rootConfig The `bunyan` logger configuration object to use for
     *                   the root logger
     */
    static configure(rootConfig: Logger.LoggerOptions): void;
    private static defaultConfig;
    private static rootConfig;
    private static loggerInstance;
    private constructor();
}
export { BunyanProvider, Logger, LogLevel, };
