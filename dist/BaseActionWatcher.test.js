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
const BaseActionWatcher_1 = require("./BaseActionWatcher");
const blockchains_1 = __importDefault(require("./testHelpers/blockchains"));
const TestActionHandler_1 = require("./testHelpers/TestActionHandler");
const TestActionReader_1 = require("./testHelpers/TestActionReader");
class TestActionWatcher extends BaseActionWatcher_1.BaseActionWatcher {
    _checkForBlocks(isReplay = false) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.checkForBlocks(isReplay);
        });
    }
    setProcessIntervals(intervals) {
        this.processIntervals = intervals;
    }
}
describe('BaseActionWatcher', () => {
    let actionReader;
    let actionReaderStartAt3;
    let actionReaderNegative;
    let blockchain;
    let actionHandler;
    let actionHandlerStartAt3;
    let actionHandlerNegative;
    let actionWatcher;
    let actionWatcherStartAt3;
    let actionWatcherNegative;
    const runEffect = jest.fn();
    beforeEach(() => {
        actionReader = new TestActionReader_1.TestActionReader({ logLevel: 'error' });
        actionReader.isInitialized = true;
        actionReaderStartAt3 = new TestActionReader_1.TestActionReader({ startAtBlock: 3, logLevel: 'error' });
        actionReaderStartAt3.isInitialized = true;
        actionReaderNegative = new TestActionReader_1.TestActionReader({ startAtBlock: -1, logLevel: 'error' });
        actionReaderNegative.isInitialized = true;
        blockchain = JSON.parse(JSON.stringify(blockchains_1.default.blockchain));
        actionReader.blockchain = blockchain;
        actionReaderStartAt3.blockchain = blockchain;
        actionReaderNegative.blockchain = blockchain;
        const updaters = [{
                actionType: 'eosio.token::transfer',
                apply: (state, payload) => __awaiter(this, void 0, void 0, function* () {
                    if (!state.totalTransferred) {
                        state.totalTransferred = parseFloat(payload.data.quantity.amount);
                    }
                    else {
                        state.totalTransferred += parseFloat(payload.data.quantity.amount);
                    }
                }),
            }];
        const effects = [{
                actionType: 'eosio.token::transfer',
                run: runEffect,
            }];
        actionHandler = new TestActionHandler_1.TestActionHandler([{ versionName: 'v1', updaters, effects }]);
        actionHandler.isInitialized = true;
        actionHandlerStartAt3 = new TestActionHandler_1.TestActionHandler([{ versionName: 'v1', updaters, effects }]);
        actionHandlerStartAt3.isInitialized = true;
        actionHandlerNegative = new TestActionHandler_1.TestActionHandler([{ versionName: 'v1', updaters, effects }]);
        actionHandlerNegative.isInitialized = true;
        const actionWatcherOptions = {
            pollInterval: 500,
            velocitySampleSize: 3,
            logLevel: 'error',
        };
        actionWatcher = new TestActionWatcher(actionReader, actionHandler, actionWatcherOptions);
        actionWatcherStartAt3 = new TestActionWatcher(actionReaderStartAt3, actionHandlerStartAt3, actionWatcherOptions);
        actionWatcherNegative = new TestActionWatcher(actionReaderNegative, actionHandlerNegative, actionWatcherOptions);
    });
    it('processes blocks', () => __awaiter(this, void 0, void 0, function* () {
        yield actionWatcher._checkForBlocks();
        expect(actionHandler.state).toEqual({
            indexState: {
                blockHash: '0000000000000000000000000000000000000000000000000000000000000003',
                blockNumber: 4,
                handlerVersionName: 'v1',
                isReplay: false,
            },
            totalTransferred: 66,
        });
        expect(actionReader.info.currentBlockNumber).toBe(4);
    }));
    it('processes blocks starting at block 3', () => __awaiter(this, void 0, void 0, function* () {
        yield actionWatcherStartAt3._checkForBlocks();
        expect(actionHandlerStartAt3.state).toEqual({
            indexState: {
                blockHash: '0000000000000000000000000000000000000000000000000000000000000003',
                blockNumber: 4,
                handlerVersionName: 'v1',
                isReplay: false,
            },
            totalTransferred: 24,
        });
        expect(actionReaderStartAt3.info.currentBlockNumber).toBe(4);
    }));
    it('processes blocks starting at block 3 (negative indexed)', () => __awaiter(this, void 0, void 0, function* () {
        yield actionWatcherNegative._checkForBlocks();
        expect(actionHandlerNegative.state).toEqual({
            indexState: {
                blockHash: '0000000000000000000000000000000000000000000000000000000000000003',
                blockNumber: 4,
                handlerVersionName: 'v1',
                isReplay: false,
            },
            totalTransferred: 24,
        });
        expect(actionReaderNegative.info.currentBlockNumber).toBe(4);
    }));
    it('processes blocks after seeing more blocks', () => __awaiter(this, void 0, void 0, function* () {
        yield actionWatcher._checkForBlocks();
        actionReader.blockchain.push({
            blockInfo: {
                blockHash: 'newblock',
                blockNumber: 5,
                previousBlockHash: '0000000000000000000000000000000000000000000000000000000000000003',
                timestamp: new Date('2018-06-06T11:53:39.500'),
            },
            actions: [{
                    payload: {
                        account: 'eosio.token',
                        actionIndex: 0,
                        authorization: [],
                        data: {
                            quantity: {
                                amount: '123.00000',
                                symbol: 'EOS',
                            },
                        },
                        name: 'transfer',
                        transactionId: '1',
                    },
                    type: 'eosio.token::transfer',
                }],
        });
        yield actionWatcher._checkForBlocks();
        expect(actionHandler.state).toEqual({
            indexState: {
                blockHash: 'newblock',
                blockNumber: 5,
                handlerVersionName: 'v1',
                isReplay: false,
            },
            totalTransferred: 189,
        });
    }));
    it('continues indexing where action handler left off', () => __awaiter(this, void 0, void 0, function* () {
        actionHandler.state.indexState = {
            blockNumber: blockchain[2].blockInfo.blockNumber,
            blockHash: blockchain[2].blockInfo.blockHash,
            handlerVersionName: 'v1',
        };
        yield actionWatcher._checkForBlocks();
        expect(actionHandler.state.indexState.blockNumber).toEqual(4);
        expect(actionReader.info.currentBlockNumber).toBe(4);
        expect(actionReader.info.headBlockNumber).toBe(4);
    }));
    it('resolves fork', () => __awaiter(this, void 0, void 0, function* () {
        actionReader._testLastIrreversible = 1;
        actionReader.blockchain = blockchain.slice(0, 4);
        yield actionWatcher._checkForBlocks();
        actionReader.blockchain = blockchains_1.default.forked;
        yield actionWatcher._checkForBlocks();
        expect(actionHandler.state.indexState.blockNumber).toEqual(5);
        expect(actionReader.info.currentBlockNumber).toBe(5);
        expect(actionReader.info.headBlockNumber).toBe(5);
    }));
    it('gives the correct block velocity', () => {
        actionWatcher.setProcessIntervals([
            [0, 1000],
            [2000, 3000],
            [4000, 5000],
        ]);
        const { currentBlockVelocity, currentBlockInterval, maxBlockVelocity } = actionWatcher.info.watcher;
        expect(currentBlockVelocity).toEqual(0.5);
        expect(currentBlockInterval).toEqual(2);
        expect(maxBlockVelocity).toEqual(1);
    });
    it('gives no block velocity', () => {
        actionWatcher.setProcessIntervals([
            [0, 1000],
        ]);
        const { currentBlockVelocity, currentBlockInterval, maxBlockVelocity } = actionWatcher.info.watcher;
        expect(currentBlockVelocity).toEqual(0);
        expect(currentBlockInterval).toEqual(0);
        expect(maxBlockVelocity).toEqual(1);
    });
    it('gives no max block velocity', () => {
        const { currentBlockVelocity, currentBlockInterval, maxBlockVelocity } = actionWatcher.info.watcher;
        expect(currentBlockVelocity).toEqual(0);
        expect(currentBlockInterval).toEqual(0);
        expect(maxBlockVelocity).toEqual(0);
    });
});
//# sourceMappingURL=BaseActionWatcher.test.js.map