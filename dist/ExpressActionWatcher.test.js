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
const supertest_1 = __importDefault(require("supertest"));
const ExpressActionWatcher_1 = require("./ExpressActionWatcher");
const blockchains_1 = __importDefault(require("./testHelpers/blockchains"));
const TestActionHandler_1 = require("./testHelpers/TestActionHandler");
const TestActionReader_1 = require("./testHelpers/TestActionReader");
const wait = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
describe('ExpressActionWatcher', () => {
    let actionReader;
    let actionHandler;
    let expressActionWatcher;
    let blockchain;
    beforeEach(() => {
        actionReader = new TestActionReader_1.TestActionReader();
        actionReader.isInitialized = true;
        blockchain = JSON.parse(JSON.stringify(blockchains_1.default.blockchain));
        actionReader.blockchain = blockchain;
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
        actionHandler = new TestActionHandler_1.TestActionHandler([{ versionName: 'v1', updaters, effects: [] }]);
        actionHandler.isInitialized = true;
        expressActionWatcher = new ExpressActionWatcher_1.ExpressActionWatcher(actionReader, actionHandler, {
            pollInterval: 500,
            port: 56544,
            logLevel: 'error',
        });
    });
    afterEach(() => {
        // tslint:disable-next-line:no-floating-promises
        expressActionWatcher.close();
    });
    it('defaults to initial indexing status', () => __awaiter(this, void 0, void 0, function* () {
        yield expressActionWatcher.listen();
        const server = supertest_1.default(expressActionWatcher.express);
        const status = yield server.get('/info');
        expect(JSON.parse(status.text)).toEqual({
            handler: {
                lastProcessedBlockHash: '',
                lastProcessedBlockNumber: 0,
                isReplay: false,
                lastIrreversibleBlockNumber: 0,
                handlerVersionName: 'v1',
                effectRunMode: 'all',
                effectErrors: [],
                numberOfRunningEffects: 0,
            },
            reader: {
                currentBlockNumber: 0,
                headBlockNumber: 0,
                lastIrreversibleBlockNumber: 0,
                onlyIrreversible: false,
                startAtBlock: 1,
            },
            watcher: {
                currentBlockInterval: 0,
                currentBlockVelocity: 0,
                indexingStatus: 'initial',
                maxBlockVelocity: 0,
            },
        });
    }));
    it('starts indexing', () => __awaiter(this, void 0, void 0, function* () {
        yield expressActionWatcher.listen();
        const server = supertest_1.default(expressActionWatcher.express);
        const started = yield server.post('/start');
        expect(JSON.parse(started.text)).toEqual({
            success: true,
        });
        const statusText = yield server.get('/info');
        const status = JSON.parse(statusText.text);
        expect(status.handler).toEqual({
            lastProcessedBlockHash: '0000000000000000000000000000000000000000000000000000000000000003',
            lastProcessedBlockNumber: 4,
            isReplay: false,
            handlerVersionName: 'v1',
            effectRunMode: 'all',
            effectErrors: [],
            numberOfRunningEffects: 0,
        });
        expect(status.reader).toEqual({
            currentBlockNumber: 4,
            headBlockNumber: 4,
            lastIrreversibleBlockNumber: 4,
            onlyIrreversible: false,
            startAtBlock: 1,
        });
        expect(status.watcher.indexingStatus).toEqual('indexing');
    }));
    it('pauses indexing', () => __awaiter(this, void 0, void 0, function* () {
        yield expressActionWatcher.listen();
        const server = supertest_1.default(expressActionWatcher.express);
        yield server.post('/start');
        const paused = yield server.post('/pause');
        expect(JSON.parse(paused.text)).toEqual({
            success: true,
        });
        const statusText1 = yield server.get('/info');
        const status1 = JSON.parse(statusText1.text);
        expect(status1.handler).toEqual({
            lastProcessedBlockHash: '0000000000000000000000000000000000000000000000000000000000000003',
            lastProcessedBlockNumber: 4,
            isReplay: false,
            handlerVersionName: 'v1',
            effectRunMode: 'all',
            effectErrors: [],
            numberOfRunningEffects: 0,
        });
        expect(status1.reader).toEqual({
            currentBlockNumber: 4,
            headBlockNumber: 4,
            lastIrreversibleBlockNumber: 4,
            onlyIrreversible: false,
            startAtBlock: 1,
        });
        expect(status1.watcher.indexingStatus).toEqual('pausing');
        yield wait(500);
        const status2Text = yield server.get('/info');
        const status2 = JSON.parse(status2Text.text);
        expect(status2.handler).toEqual({
            lastProcessedBlockHash: '0000000000000000000000000000000000000000000000000000000000000003',
            lastProcessedBlockNumber: 4,
            isReplay: false,
            handlerVersionName: 'v1',
            effectRunMode: 'all',
            effectErrors: [],
            numberOfRunningEffects: 0,
        });
        expect(status2.reader).toEqual({
            currentBlockNumber: 4,
            headBlockNumber: 4,
            lastIrreversibleBlockNumber: 4,
            onlyIrreversible: false,
            startAtBlock: 1,
        });
        expect(status2.watcher.indexingStatus).toEqual('paused');
    }));
});
//# sourceMappingURL=ExpressActionWatcher.test.js.map