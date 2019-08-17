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
const errors_1 = require("./errors");
const blockchains_1 = __importDefault(require("./testHelpers/blockchains"));
const TestActionReader_1 = require("./testHelpers/TestActionReader");
describe('Action Reader', () => {
    let actionReader;
    let actionReaderStartAt3;
    let actionReaderNegative;
    let blockchain;
    let forked;
    beforeEach(() => {
        actionReader = new TestActionReader_1.TestActionReader({ logLevel: 'error' });
        actionReader.isInitialized = true;
        actionReaderStartAt3 = new TestActionReader_1.TestActionReader({ startAtBlock: 3, logLevel: 'error' });
        actionReaderStartAt3.isInitialized = true;
        actionReaderNegative = new TestActionReader_1.TestActionReader({ startAtBlock: -1, logLevel: 'error' });
        actionReaderNegative.isInitialized = true;
        blockchain = JSON.parse(JSON.stringify(blockchains_1.default.blockchain));
        forked = JSON.parse(JSON.stringify(blockchains_1.default.forked));
        actionReader.blockchain = blockchain;
        actionReaderStartAt3.blockchain = blockchain;
        actionReaderNegative.blockchain = blockchain;
    });
    it('gets the head block number', () => __awaiter(this, void 0, void 0, function* () {
        const headBlockNumber = yield actionReader.getHeadBlockNumber();
        expect(headBlockNumber).toBe(4);
    }));
    it('gets the next block', () => __awaiter(this, void 0, void 0, function* () {
        const { block } = yield actionReader.getNextBlock();
        expect(block.blockInfo.blockNumber).toBe(1);
    }));
    it('gets the next block when starting ahead', () => __awaiter(this, void 0, void 0, function* () {
        const { block } = yield actionReaderStartAt3.getNextBlock();
        expect(block.blockInfo.blockNumber).toBe(3);
    }));
    it('gets the next block when negative indexing', () => __awaiter(this, void 0, void 0, function* () {
        const { block } = yield actionReaderNegative.getNextBlock();
        expect(block.blockInfo.blockNumber).toBe(3);
    }));
    it('seeks to the first block', () => __awaiter(this, void 0, void 0, function* () {
        yield actionReader.getNextBlock();
        yield actionReader.getNextBlock();
        yield actionReader.getNextBlock();
        yield actionReader.getNextBlock();
        yield actionReader.seekToBlock(1);
        const { block, blockMeta } = yield actionReader.getNextBlock();
        expect(block.blockInfo.blockNumber).toBe(1);
        expect(blockMeta.isEarliestBlock).toBe(true);
    }));
    it('seeks to non-first block', () => __awaiter(this, void 0, void 0, function* () {
        yield actionReader.getNextBlock();
        yield actionReader.getNextBlock();
        yield actionReader.getNextBlock();
        yield actionReader.getNextBlock();
        yield actionReader.seekToBlock(2);
        const { block } = yield actionReader.getNextBlock();
        expect(block.blockInfo.blockNumber).toBe(2);
    }));
    it('seeks to head block + 1', () => __awaiter(this, void 0, void 0, function* () {
        yield actionReader.getNextBlock();
        yield actionReader.seekToBlock(5);
        const { block } = yield actionReader.getNextBlock();
        expect(block.blockInfo.blockNumber).toBe(4);
    }));
    it('does not seek to block earlier than startAtBlock', () => __awaiter(this, void 0, void 0, function* () {
        yield actionReaderStartAt3.getNextBlock();
        const result = actionReaderStartAt3.seekToBlock(2);
        yield expect(result).rejects.toThrow(errors_1.ImproperStartAtBlockError);
    }));
    it('handles rollback correctly', () => __awaiter(this, void 0, void 0, function* () {
        actionReader._testLastIrreversible = 1;
        yield actionReader.getNextBlock();
        yield actionReader.getNextBlock();
        yield actionReader.getNextBlock();
        yield actionReader.getNextBlock();
        actionReader.blockchain = forked;
        const { block, blockMeta } = yield actionReader.getNextBlock();
        expect(blockMeta.isRollback).toBe(true);
        expect(block.blockInfo.blockHash).toBe('foo');
        const { block: block2, blockMeta: blockMeta2 } = yield actionReader.getNextBlock();
        expect(blockMeta2.isRollback).toBe(false);
        expect(block2.blockInfo.blockHash).toBe('wrench');
        const { block: block3, blockMeta: blockMeta3 } = yield actionReader.getNextBlock();
        expect(blockMeta3.isRollback).toBe(false);
        expect(block3.blockInfo.blockHash).toBe('madeit');
    }));
    it('indicates when the same block is returned', () => __awaiter(this, void 0, void 0, function* () {
        yield actionReader.getNextBlock();
        yield actionReader.getNextBlock();
        yield actionReader.getNextBlock();
        yield actionReader.getNextBlock();
        const { blockMeta } = (yield actionReader.getNextBlock());
        expect(blockMeta.isNewBlock).toBe(false);
    }));
    it('prunes history to last irreversible block', () => __awaiter(this, void 0, void 0, function* () {
        actionReader._testLastIrreversible = 1;
        yield actionReader.getNextBlock();
        yield actionReader.getNextBlock();
        yield actionReader.getNextBlock();
        expect(actionReader._lastIrreversibleBlockNumber).toEqual(1);
        expect(actionReader._blockHistory[0].blockInfo.blockNumber).toEqual(actionReader._lastIrreversibleBlockNumber);
        actionReader._testLastIrreversible = 3;
        yield actionReader.getNextBlock();
        expect(actionReader._lastIrreversibleBlockNumber).toEqual(3);
        expect(actionReader._blockHistory[0].blockInfo.blockNumber).toEqual(actionReader._lastIrreversibleBlockNumber);
    }));
    it('continues ifSetup true', () => __awaiter(this, void 0, void 0, function* () {
        actionReader.isInitialized = true;
        const { block } = yield actionReader.getNextBlock();
        expect(block.blockInfo.blockNumber).toBe(1);
    }));
    it('continues ifSetup true', () => __awaiter(this, void 0, void 0, function* () {
        actionReader.isInitialized = false;
        const result = actionReader.getNextBlock();
        yield expect(result).rejects.toThrow(errors_1.NotInitializedError);
    }));
});
//# sourceMappingURL=AbstractActionReader.test.js.map