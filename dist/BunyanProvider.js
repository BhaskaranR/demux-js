"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Logger = __importStar(require("bunyan"));
exports.Logger = Logger;
/**
 * Provides a configured singleton instance of the `bunyan` logger.
 */
class BunyanProvider {
    constructor() { }
    /**
     * Create an return a 'child' logger of the root Bunyan logger. The root logger
     * is created on the first call to `getLogger` using the current set configuration.
     * Subsequent calls to `configure` will be ignored.
     *
     * @param logOptions The source name and log level for the child logger
     */
    static getLogger(logOptions) {
        if (!BunyanProvider.loggerInstance) {
            BunyanProvider.loggerInstance = Logger.createLogger(BunyanProvider.rootConfig);
        }
        return BunyanProvider.loggerInstance.child({
            source: logOptions.logSource || 'undefined',
            level: logOptions.logLevel || 'info',
        }, false);
    }
    /**
     * Set the `bunyan` configuration. This may be called multiple times,
     * with each call replacing the previously set configuration. However
     * after the first call to `getLogger` the root logger will be created
     * and further calls to `configure` will be ignore, with a logged warning.
     *
     * @param rootConfig The `bunyan` logger configuration object to use for
     *                   the root logger
     */
    static configure(rootConfig) {
        if (BunyanProvider.loggerInstance) {
            BunyanProvider.loggerInstance.warn({ source: 'BunyanProvider' });
        }
        BunyanProvider.rootConfig = Object.assign({}, BunyanProvider.defaultConfig, rootConfig);
        BunyanProvider.loggerInstance = null;
    }
}
BunyanProvider.defaultConfig = {
    source: 'demux',
    name: 'demux',
};
BunyanProvider.rootConfig = BunyanProvider.defaultConfig;
BunyanProvider.loggerInstance = null;
exports.BunyanProvider = BunyanProvider;
//# sourceMappingURL=BunyanProvider.js.map