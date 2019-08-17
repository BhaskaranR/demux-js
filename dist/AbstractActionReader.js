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
const errors_1 = require("./errors");
const defaultBlock = {
    blockInfo: {
        blockNumber: 0,
        blockHash: '',
        previousBlockHash: '',
        timestamp: new Date(0),
    },
    actions: [],
};
/**
 * Reads blocks from a blockchain, outputting normalized `Block` objects.
 */
class AbstractActionReader {
    constructor(options = {}) {
        this.headBlockNumber = 0;
        this.currentBlockData = defaultBlock;
        this.lastIrreversibleBlockNumber = 0;
        this.blockHistory = [];
        this.initialized = false;
        const optionsWithDefaults = Object.assign({ startAtBlock: 1, onlyIrreversible: false, logSource: 'AbstractActionReader', logLevel: 'info' }, options);
        this.startAtBlock = optionsWithDefaults.startAtBlock;
        this.currentBlockNumber = optionsWithDefaults.startAtBlock - 1;
        this.onlyIrreversible = optionsWithDefaults.onlyIrreversible;
        this.log = BunyanProvider_1.BunyanProvider.getLogger(optionsWithDefaults);
    }
    /**
     * Loads, processes, and returns the next block, updating all relevant state. Return value at index 0 is the `Block`
     * instance; return value at index 1 boolean `isRollback` determines if the implemented `AbstractActionHandler` needs
     * to potentially reverse processed blocks (in the event of a fork); return value at index 2 boolean `isNewBlock`
     * indicates if the `Block` instance returned is the same one that was just returned from the last call of
     * `nextBlock`.
     */
    getNextBlock() {
        return __awaiter(this, void 0, void 0, function* () {
            const blockMeta = {
                isRollback: false,
                isNewBlock: false,
                isEarliestBlock: false,
            };
            if (!this.initialized) {
                this.log.info('Action Reader was not initialized before started, so it is being initialized now');
                yield this.initialize();
            }
            this.log.debug('Getting last irreversible block number...');
            const lastIrreversibleStart = Date.now();
            this.lastIrreversibleBlockNumber = yield this.getLastIrreversibleBlockNumber();
            const lastIrreversibleTime = Date.now() - lastIrreversibleStart;
            this.log.debug(`Got last irreversible block number: ${this.lastIrreversibleBlockNumber} (${lastIrreversibleTime}ms)`);
            if (this.currentBlockNumber === this.headBlockNumber) {
                this.headBlockNumber = yield this.getLatestNeededBlockNumber();
            }
            if (this.currentBlockNumber < this.headBlockNumber) {
                const unvalidatedBlockData = yield this.loggedGetBlock(this.currentBlockNumber + 1, 'next block');
                const expectedHash = this.currentBlockData.blockInfo.blockHash;
                const actualHash = this.currentBlockNumber ?
                    unvalidatedBlockData.blockInfo.previousBlockHash :
                    defaultBlock.blockInfo.blockHash;
                if (expectedHash === actualHash) {
                    this.acceptBlock(unvalidatedBlockData);
                    blockMeta.isNewBlock = true;
                }
                else {
                    this.logForkDetected(unvalidatedBlockData, expectedHash, actualHash);
                    yield this.resolveFork();
                    blockMeta.isNewBlock = true;
                    blockMeta.isRollback = true;
                    // Reset for safety, as new fork could have less blocks than the previous fork
                    this.headBlockNumber = yield this.getLatestNeededBlockNumber();
                }
            }
            blockMeta.isEarliestBlock = this.currentBlockNumber === this.startAtBlock;
            return {
                block: this.currentBlockData,
                blockMeta,
                lastIrreversibleBlockNumber: this.lastIrreversibleBlockNumber,
            };
        });
    }
    /**
     * Performs all required initialization for the reader.
     */
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.debug('Initializing Action Reader...');
            const setupStart = Date.now();
            yield this.setup();
            const betweenSetupAndInit = Date.now();
            yield this.initBlockState();
            this.initialized = true;
            const setupTime = betweenSetupAndInit - setupStart;
            const initTime = Date.now() - betweenSetupAndInit;
            const initializeTime = setupTime + initTime;
            this.log.debug(`Initialized Action Reader (${setupTime}ms setup + ${initTime}ms block state init = ${initializeTime}ms)`);
        });
    }
    /**
     * Changes the state of the `AbstractActionReader` instance to have just processed the block at the given block
     * number. If the block exists in its temporary block history, it will use this, otherwise it will fetch the block
     * using `getBlock`.
     *
     * The next time `nextBlock()` is called, it will load the block after this input block number.
     */
    seekToBlock(blockNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.debug(`Seeking to block ${blockNumber}...`);
            const seekStart = Date.now();
            this.headBlockNumber = yield this.getLatestNeededBlockNumber();
            if (blockNumber < this.startAtBlock) {
                throw new errors_1.ImproperStartAtBlockError(blockNumber, this.startAtBlock);
            }
            if (blockNumber > this.headBlockNumber + 1) {
                throw new errors_1.ImproperSeekToBlockError(blockNumber);
            }
            this.currentBlockNumber = blockNumber - 1;
            yield this.reloadHistory();
            const seekTime = Date.now() - seekStart;
            this.log.debug(`Seeked to block ${blockNumber} (${seekTime}ms)`);
        });
    }
    /**
     * Information about the current state of the Action Reader
     */
    get info() {
        return {
            currentBlockNumber: this.currentBlockNumber,
            startAtBlock: this.startAtBlock,
            headBlockNumber: this.headBlockNumber,
            onlyIrreversible: this.onlyIrreversible,
            lastIrreversibleBlockNumber: this.lastIrreversibleBlockNumber,
        };
    }
    /**
     * Incrementally rolls back reader state one block at a time, comparing the blockHistory with
     * newly fetched blocks. Fork resolution is finished when either the current block's previous hash
     * matches the previous block's hash, or when history is exhausted.
     */
    resolveFork() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.blockHistory.length === 0) {
                yield this.addPreviousBlockToHistory();
            }
            // Pop off blocks from cached block history and compare them with freshly fetched blocks
            while (this.blockHistory.length > 0) {
                if (this.blockHistory.length === 0) {
                    yield this.addPreviousBlockToHistory();
                }
                const [previousBlockData] = this.blockHistory.slice(-1);
                this.log.info(`Refetching Block ${this.currentBlockData.blockInfo.blockNumber}...`);
                this.currentBlockData = yield this.loggedGetBlock(this.currentBlockData.blockInfo.blockNumber, 'resolving fork');
                const { blockInfo: currentBlockInfo } = this.currentBlockData;
                const { blockInfo: previousBlockInfo } = previousBlockData;
                if (currentBlockInfo.previousBlockHash === previousBlockInfo.blockHash) {
                    this.logForkResolved(currentBlockInfo, previousBlockInfo);
                    break;
                }
                this.logForkMismatch(currentBlockInfo, previousBlockInfo);
                this.currentBlockData = previousBlockData;
                this.blockHistory.pop();
            }
            if (this.blockHistory.length === 0) {
                yield this.addPreviousBlockToHistory();
            }
            this.currentBlockNumber = this.blockHistory[this.blockHistory.length - 1].blockInfo.blockNumber + 1;
        });
    }
    initBlockState() {
        return __awaiter(this, void 0, void 0, function* () {
            this.lastIrreversibleBlockNumber = yield this.getLastIrreversibleBlockNumber();
            this.headBlockNumber = yield this.getLatestNeededBlockNumber();
            if (this.currentBlockNumber < 0) {
                this.currentBlockNumber = this.headBlockNumber + this.currentBlockNumber;
                this.startAtBlock = this.currentBlockNumber + 1;
            }
            yield this.reloadHistory();
        });
    }
    getLatestNeededBlockNumber() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.onlyIrreversible) {
                return this.lastIrreversibleBlockNumber;
            }
            else {
                const headBlockFetchStart = Date.now();
                this.log.debug('Getting head block number...');
                const headBlockNumber = yield this.getHeadBlockNumber();
                const headBlockFetchTime = Date.now() - headBlockFetchStart;
                this.log.debug(`Got head block number: ${headBlockNumber} (${headBlockFetchTime}ms)`);
                return headBlockNumber;
            }
        });
    }
    acceptBlock(blockData) {
        this.blockHistory.push(this.currentBlockData);
        this.pruneHistory();
        this.currentBlockData = blockData;
        this.currentBlockNumber = this.currentBlockData.blockInfo.blockNumber;
    }
    range(start, end) {
        if (start > end) {
            return [];
        }
        return Array(end - start).fill(0).map((_, i) => i + start);
    }
    pruneHistory() {
        let toDelete = 0;
        for (const block of this.blockHistory) {
            if (block.blockInfo.blockNumber < this.lastIrreversibleBlockNumber) {
                toDelete += 1;
            }
            else {
                break;
            }
        }
        if (toDelete === this.blockHistory.length) {
            this.blockHistory = [this.blockHistory[this.blockHistory.length - 1]];
            return;
        }
        this.blockHistory.splice(0, toDelete);
    }
    reloadHistory(maxTries = 10) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.currentBlockNumber === 0) {
                this.blockHistory = [];
                this.currentBlockData = defaultBlock;
                return;
            }
            if (this.currentBlockNumber === 1) {
                this.blockHistory = [defaultBlock];
                this.currentBlockData = yield this.loggedGetBlock(1, 'reloading history first block edge case');
                return;
            }
            let historyRange = this.range(this.lastIrreversibleBlockNumber, this.currentBlockNumber + 1);
            if (historyRange.length <= 1) {
                historyRange = [this.currentBlockNumber - 1, this.currentBlockNumber];
            }
            let microForked = true;
            let tryCount = 0;
            while (microForked) {
                microForked = false;
                this.blockHistory = [];
                for (const blockNumber of historyRange) {
                    const historyBlock = yield this.loggedGetBlock(blockNumber, 'reloading history');
                    if (this.blockHistory.length === 0) {
                        this.blockHistory.push(historyBlock);
                        continue;
                    }
                    const latestHistoryBlockHash = this.blockHistory[this.blockHistory.length - 1].blockInfo.blockHash;
                    if (latestHistoryBlockHash !== historyBlock.blockInfo.previousBlockHash) {
                        this.log.info('Microforked while reloading history!');
                        this.log.info(`  EXPECTED: ${latestHistoryBlockHash}`);
                        this.log.info(`  RECEIVED: ${historyBlock.blockInfo.previousBlockHash}`);
                        this.log.info(`Scrapping history and trying again (try ${tryCount + 1})`);
                        microForked = true;
                        break;
                    }
                    this.blockHistory.push(historyBlock);
                }
                tryCount += 1;
                if (tryCount === maxTries) {
                    throw new errors_1.ReloadHistoryError();
                }
            }
            this.currentBlockData = this.blockHistory.pop();
        });
    }
    addPreviousBlockToHistory(checkIrreversiblility = true) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.currentBlockData.blockInfo.blockNumber < this.lastIrreversibleBlockNumber && checkIrreversiblility) {
                throw new errors_1.UnresolvedForkError();
            }
            this.blockHistory.push(yield this.loggedGetBlock(this.currentBlockData.blockInfo.blockNumber - 1, 'populating history'));
        });
    }
    loggedGetBlock(blockNumber, logContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const getBlockStart = Date.now();
            this.log.debug(`Getting block ${blockNumber}... (${logContext})`);
            const block = yield this.getBlock(blockNumber);
            const getBlockFetchTime = Date.now() - getBlockStart;
            this.log.debug(`Got block ${blockNumber} (${getBlockFetchTime}ms; ${block.actions.length} actions)`);
            return block;
        });
    }
    logForkDetected(unvalidatedBlockData, expectedHash, actualHash) {
        this.log.info('!! FORK DETECTED !!');
        this.log.info(`  MISMATCH:`);
        this.log.info(`    ✓ NEW Block ${unvalidatedBlockData.blockInfo.blockNumber} previous: ${actualHash}`);
        this.log.info(`    ✕ OLD Block ${this.currentBlockNumber} id:       ${expectedHash}`);
    }
    logForkResolved(currentBlockInfo, previousBlockInfo) {
        this.log.info('  MATCH:');
        this.log.info(`    ✓ NEW Block ${currentBlockInfo.blockNumber} previous: ${currentBlockInfo.previousBlockHash}`); // tslint:disable-line
        this.log.info(`    ✓ OLD Block ${previousBlockInfo.blockNumber} id:       ${previousBlockInfo.blockHash}`);
        this.log.info('!! FORK RESOLVED !!');
    }
    logForkMismatch(currentBlockInfo, previousBlockInfo) {
        this.log.info('  MISMATCH:');
        this.log.info(`    ✓ NEW Block ${currentBlockInfo.blockNumber} previous: ${currentBlockInfo.previousBlockHash}`);
        this.log.info(`    ✕ OLD Block ${previousBlockInfo.blockNumber} id:       ${previousBlockInfo.blockHash}`);
    }
}
exports.AbstractActionReader = AbstractActionReader;
//# sourceMappingURL=AbstractActionReader.js.map