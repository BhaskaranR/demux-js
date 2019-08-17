"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const BaseActionWatcher_1 = require("./BaseActionWatcher");
/**
 * Exposes the BaseActionWatcher's API methods through a simple REST interface using Express
 */
class ExpressActionWatcher extends BaseActionWatcher_1.BaseActionWatcher {
    constructor(actionReader, actionHandler, options) {
        super(actionReader, actionHandler, options);
        this.actionReader = actionReader;
        this.actionHandler = actionHandler;
        this.options = options;
        /**
         * @param actionReader    An instance of an implemented `ActionReader`
         * @param actionHandler   An instance of an implemented `ActionHandler`
         * @param options
         */
        this.express = express_1.default(); // How expressive
        this.server = null;
        this.port = options.port || 56544;
        this.express.get('/info', (_, res) => {
            res.json(this.info);
        });
        this.express.post('/start', (_, res) => {
            res.json({ success: this.start() });
        });
        this.express.post('/pause', (_, res) => {
            res.json({ success: this.pause() });
        });
    }
    /**
     * Start the Express server
     */
    listen() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.server) {
                this.log.warn(`API server already listening on port ${this.port}.`);
                return false;
            }
            this.server = yield this.express.listen(this.port);
            this.log.info(`API server listening on port ${this.port}.`);
            return true;
        });
    }
    /**
     * Close the Express server
     */
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.server) {
                this.log.warn(`API server cannot close because it is not listening.`);
                return false;
            }
            this.log.info(`API server closing down. (NOTE: This does not shut down Demux itself!)`);
            yield this.server.close();
            this.server = null;
            return true;
        });
    }
}
exports.ExpressActionWatcher = ExpressActionWatcher;
//# sourceMappingURL=ExpressActionWatcher.js.map