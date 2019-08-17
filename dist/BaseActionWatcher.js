"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const BunyanProvider_1 = require("./BunyanProvider");
const interfaces_1 = require("./interfaces");
/**
 * Coordinates implementations of `ActionReader`s and `ActionHandler`s in
 * a polling loop.
 */
class BaseActionWatcher {
    constructor(actionReader, actionHandler, options) {
        this.actionReader = actionReader;
        this.actionHandler = actionHandler;
        this.processIntervals = [];
        this.running = false;
        this.shouldPause = false;
        this.error = null;
        this.clean = true;
        const optionsWithDefaults = Object.assign({ pollInterval: 250, velocitySampleSize: 20, logSource: 'BaseActionWatcher', logLevel: 'info' }, options);
        this.pollInterval = optionsWithDefaults.pollInterval;
        this.velocitySampleSize = optionsWithDefaults.velocitySampleSize;
        this.log = BunyanProvider_1.BunyanProvider.getLogger(optionsWithDefaults);
    }
    /**
     * Starts a polling loop running in replay mode.
     */
    replay() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.watch(true);
        });
    }
    /**
     * Start a polling loop
     *
     * @param isReplay  Set to true to disable Effects from running until caught up with head block.
     */
    watch(isReplay = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.shouldPause) {
                this.running = false;
                this.shouldPause = false;
                this.log.info('Indexing paused.');
                return;
            }
            this.clean = false;
            this.running = true;
            this.error = null;
            const startTime = Date.now();
            this.log.debug('Checking for blocks...');
            try {
                yield this.checkForBlocks(isReplay);
            }
            catch (err) {
                this.running = false;
                this.shouldPause = false;
                this.processIntervals = [];
                this.log.error(err);
                this.error = err;
                this.log.info('Indexing unexpectedly stopped due to an error.');
                return;
            }
            const endTime = Date.now();
            const duration = endTime - startTime;
            let waitTime = this.pollInterval - duration;
            if (waitTime < 0) {
                waitTime = 0;
            }
            this.log.debug(`Block check took ${duration}ms; waiting ${waitTime}ms before next check`);
            setTimeout(() => __awaiter(this, void 0, void 0, function* () { return yield this.watch(false); }), waitTime);
        });
    }
    /**
     * Start or resume indexing.
     */
    start() {
        if (this.running) {
            this.log.info('Cannot start; already indexing.');
            return false;
        }
        this.log.info('Starting indexing.');
        // tslint:disable-next-line:no-floating-promises
        this.watch();
        return true;
    }
    /**
     * Suspend indexing. Will go into effect after the currently-processing block.
     */
    pause() {
        if (!this.running) {
            this.log.info('Cannot pause; not currently indexing.');
            return false;
        }
        this.log.info('Pausing indexing.');
        this.shouldPause = true;
        return true;
    }
    /**
     * Information about the current state of this Action Watcher
     */
    get info() {
        const currentBlockVelocity = this.getCurrentBlockVelocity();
        const watcherInfo = {
            indexingStatus: this.getIndexingStatus(),
            currentBlockVelocity,
            currentBlockInterval: currentBlockVelocity ? 1 / currentBlockVelocity : 0,
            maxBlockVelocity: this.getMaxBlockVelocity()
        };
        if (this.error) {
            watcherInfo.error = this.error;
        }
        return {
            handler: this.actionHandler.info,
            reader: this.actionReader.info,
            watcher: watcherInfo,
        };
    }
    /**
     * Use the actionReader and actionHandler to process new blocks.
     *
     * @param isReplay  Set to true to disable Effects from running until caught up with head block.
     */
    checkForBlocks(isReplay = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let headBlockNumber = 0;
            while (!headBlockNumber || this.actionReader.info.currentBlockNumber < headBlockNumber) {
                if (this.shouldPause) {
                    this.processIntervals = [];
                    return;
                }
                const readStartTime = Date.now();
                this.log.debug(`Processing block ${this.actionReader.info.currentBlockNumber + 1}...`);
                const nextBlock = yield this.actionReader.getNextBlock();
                const readDuration = Date.now() - readStartTime;
                if (!nextBlock.blockMeta.isNewBlock) {
                    break;
                }
                const handleStartTime = Date.now();
                const nextBlockNumberNeeded = yield this.actionHandler.handleBlock(nextBlock, isReplay);
                const handleEndTime = Date.now();
                const handleDuration = handleEndTime - handleStartTime;
                const processDuration = readDuration + handleDuration;
                const blockNumber = nextBlock.block.blockInfo.blockNumber;
                this.log.info(`Processed block ${blockNumber} (${processDuration}ms; ${nextBlock.block.actions.length} actions)`);
                this.log.debug(`Block ${blockNumber} read time: ${readDuration}ms; Handle time: ${handleDuration}ms`);
                this.addProcessInterval(readStartTime, handleEndTime);
                if (nextBlockNumberNeeded) {
                    yield this.actionReader.seekToBlock(nextBlockNumberNeeded);
                }
                headBlockNumber = this.actionReader.info.headBlockNumber;
            }
        });
    }
    addProcessInterval(start, end) {
        this.processIntervals.push([start, end]);
        if (this.processIntervals.length > this.velocitySampleSize) {
            this.processIntervals.splice(0, this.processIntervals.length - this.velocitySampleSize);
        }
    }
    getCurrentBlockVelocity() {
        if (this.processIntervals.length < 2) {
            return 0;
        }
        const start = this.processIntervals[0][0];
        const end = this.processIntervals[this.processIntervals.length - 1][0];
        const interval = end - start;
        return (this.processIntervals.length - 1) / (interval / 1000);
    }
    getMaxBlockVelocity() {
        if (this.processIntervals.length === 0) {
            return 0;
        }
        const processTimes = this.processIntervals.map(([start, end]) => end - start);
        const totalTime = processTimes.reduce((prev, curr) => (prev + curr));
        const averageTime = totalTime / processTimes.length;
        if (averageTime === 0) {
            return 0;
        }
        return 1000 / averageTime;
    }
    getIndexingStatus() {
        if (this.clean) {
            return interfaces_1.IndexingStatus.Initial;
        }
        if (this.running && !this.shouldPause) {
            return interfaces_1.IndexingStatus.Indexing;
        }
        if (this.running && this.shouldPause) {
            return interfaces_1.IndexingStatus.Pausing;
        }
        if (this.error) {
            return interfaces_1.IndexingStatus.Stopped;
        }
        return interfaces_1.IndexingStatus.Paused;
    }
}
exports.BaseActionWatcher = BaseActionWatcher;
//# sourceMappingURL=BaseActionWatcher.js.map