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
const interfaces_1 = require("./interfaces");
const blockchains_1 = __importDefault(require("./testHelpers/blockchains"));
const TestActionHandler_1 = require("./testHelpers/TestActionHandler");
const wait_1 = require("./testHelpers/wait");
const { blockchain, upgradeHandler } = blockchains_1.default;
describe('Action Handler', () => {
    let actionHandler;
    let noHashValidationActionHandler;
    let noEffectActionHandler;
    let deferredEffectActionHandler;
    let immediateEffectActionHandler;
    let runUpdater;
    let runEffect;
    let notRunUpdater;
    let notRunEffect;
    let startSlowEffect;
    let finishSlowEffect;
    let startThrownEffect;
    let runUpgradeUpdater;
    let runUpdaterAfterUpgrade;
    let runEffectAfterUpgrade;
    let notRunUpdaterAfterUpgrade;
    let notRunEffectAfterUpgrade;
    beforeEach(() => {
        runUpdater = jest.fn();
        runEffect = jest.fn().mockResolvedValue(undefined);
        notRunUpdater = jest.fn();
        notRunEffect = jest.fn().mockResolvedValue(undefined);
        startSlowEffect = jest.fn().mockResolvedValue(undefined);
        finishSlowEffect = jest.fn();
        startThrownEffect = jest.fn().mockResolvedValue(undefined);
        runUpgradeUpdater = jest.fn().mockReturnValue('v2');
        runUpdaterAfterUpgrade = jest.fn();
        runEffectAfterUpgrade = jest.fn();
        notRunUpdaterAfterUpgrade = jest.fn();
        notRunEffectAfterUpgrade = jest.fn();
        const handlerVersions = [
            {
                versionName: 'v1',
                updaters: [
                    {
                        actionType: 'eosio.token::transfer',
                        apply: runUpdater,
                    },
                    {
                        actionType: 'mycontract::upgrade',
                        apply: runUpgradeUpdater,
                    },
                    {
                        actionType: 'eosio.token::issue',
                        apply: notRunUpdater,
                    },
                ],
                effects: [
                    {
                        actionType: 'eosio.token::transfer',
                        run: runEffect,
                        deferUntilIrreversible: true,
                    },
                    {
                        actionType: 'eosio::bidname',
                        run: runEffect,
                        deferUntilIrreversible: true,
                    },
                    {
                        actionType: 'eosio.token::issue',
                        run: notRunEffect,
                        deferUntilIrreversible: true,
                    },
                    {
                        actionType: 'testing::action',
                        run: () => __awaiter(this, void 0, void 0, function* () {
                            yield startSlowEffect();
                            yield wait_1.wait(100, finishSlowEffect);
                        }),
                        deferUntilIrreversible: false,
                    },
                    {
                        actionType: 'eosio.system::regproducer',
                        run: () => __awaiter(this, void 0, void 0, function* () {
                            yield startThrownEffect();
                            throw Error('Thrown effect');
                        })
                    }
                ],
            },
            {
                versionName: 'v2',
                updaters: [
                    {
                        actionType: 'eosio.token::transfer',
                        apply: notRunUpdaterAfterUpgrade,
                    },
                    {
                        actionType: 'eosio.token::issue',
                        apply: runUpdaterAfterUpgrade,
                    },
                ],
                effects: [
                    {
                        actionType: 'eosio.token::transfer',
                        run: notRunEffectAfterUpgrade,
                        deferUntilIrreversible: true,
                    },
                    {
                        actionType: 'eosio.token::issue',
                        run: runEffectAfterUpgrade,
                        deferUntilIrreversible: true,
                    },
                ],
            },
        ];
        actionHandler = new TestActionHandler_1.TestActionHandler(handlerVersions, { logLevel: 'error' });
        noHashValidationActionHandler = new TestActionHandler_1.TestActionHandler(handlerVersions, { logLevel: 'error', validateBlocks: false });
        noEffectActionHandler = new TestActionHandler_1.TestActionHandler(handlerVersions, { logLevel: 'error', effectRunMode: interfaces_1.EffectRunMode.None });
        deferredEffectActionHandler = new TestActionHandler_1.TestActionHandler(handlerVersions, { logLevel: 'error', effectRunMode: interfaces_1.EffectRunMode.OnlyDeferred });
        immediateEffectActionHandler = new TestActionHandler_1.TestActionHandler(handlerVersions, { logLevel: 'error', effectRunMode: interfaces_1.EffectRunMode.OnlyImmediate });
        actionHandler.isInitialized = true;
        noHashValidationActionHandler.isInitialized = true;
        noEffectActionHandler.isInitialized = true;
        deferredEffectActionHandler.isInitialized = true;
        immediateEffectActionHandler.isInitialized = true;
    });
    it('runs the correct updater based on action type', () => __awaiter(this, void 0, void 0, function* () {
        const blockMeta = {
            isRollback: false,
            isEarliestBlock: true,
            isNewBlock: true
        };
        const nextBlock = {
            block: blockchain[1],
            blockMeta,
            lastIrreversibleBlockNumber: 2,
        };
        yield actionHandler._applyUpdaters({}, nextBlock, {}, false);
        expect(runUpdater).toHaveBeenCalledTimes(1);
        expect(notRunUpdater).not.toHaveBeenCalled();
    }));
    it('runs the correct effect based on action type', () => __awaiter(this, void 0, void 0, function* () {
        const blockMeta = {
            isRollback: false,
            isEarliestBlock: true,
            isNewBlock: true,
        };
        const nextBlock = {
            block: blockchain[1],
            blockMeta,
            lastIrreversibleBlockNumber: 2,
        };
        const versionedActions = yield actionHandler._applyUpdaters({}, nextBlock, {}, false);
        yield actionHandler._runEffects(versionedActions, {}, nextBlock);
        expect(runEffect).toHaveBeenCalledTimes(2);
        expect(notRunEffect).not.toHaveBeenCalled();
    }));
    it('retrieves indexState when processing first block', () => __awaiter(this, void 0, void 0, function* () {
        actionHandler.state.indexState = {
            blockNumber: 3,
            blockHash: '000f42401b5636c3c1d88f31fe0e503654091fb822b0ffe21c7d35837fc9f3d8',
        };
        const blockMeta = {
            isRollback: false,
            isEarliestBlock: true,
            isNewBlock: true,
        };
        const nextBlock = {
            block: blockchain[0],
            blockMeta,
            lastIrreversibleBlockNumber: 1,
        };
        const seekBlockNum = yield actionHandler.handleBlock(nextBlock, false);
        expect(seekBlockNum).toBe(4);
    }));
    it('seeks to the next block needed when block number doesn\'t match last processed block', () => __awaiter(this, void 0, void 0, function* () {
        actionHandler.setLastProcessedBlockNumber(blockchain[1].blockInfo.blockNumber);
        actionHandler.setLastProcessedBlockHash(blockchain[1].blockInfo.blockHash);
        actionHandler.state.indexState = Object.assign({}, actionHandler.state.indexState, { blockNumber: blockchain[1].blockInfo.blockNumber, blockHash: blockchain[1].blockInfo.blockHash });
        const blockMeta = {
            isRollback: false,
            isEarliestBlock: false,
            isNewBlock: true,
        };
        const nextBlock = {
            block: blockchain[3],
            blockMeta,
            lastIrreversibleBlockNumber: 1,
        };
        const seekBlockNum = yield actionHandler.handleBlock(nextBlock, false);
        expect(seekBlockNum).toBe(3);
    }));
    it('throws error if previous block hash and last processed don\'t match up', () => __awaiter(this, void 0, void 0, function* () {
        yield actionHandler.initialize();
        actionHandler.setLastProcessedBlockNumber(3);
        actionHandler.setLastProcessedBlockHash('asdfasdfasdf');
        const blockMeta = {
            isRollback: false,
            isEarliestBlock: false,
            isNewBlock: true,
        };
        const nextBlock = {
            block: blockchain[3],
            blockMeta,
            lastIrreversibleBlockNumber: 1,
        };
        const result = actionHandler.handleBlock(nextBlock, false);
        yield expect(result).rejects.toThrow(errors_1.MismatchedBlockHashError);
    }));
    it(`doesn't throw error if validateBlocks is false`, () => __awaiter(this, void 0, void 0, function* () {
        yield noHashValidationActionHandler.initialize();
        noHashValidationActionHandler.setLastProcessedBlockNumber(3);
        noHashValidationActionHandler.setLastProcessedBlockHash('asdfasdfasdf');
        const blockMeta = {
            isRollback: false,
            isEarliestBlock: false,
            isNewBlock: true,
        };
        const nextBlock = {
            block: blockchain[3],
            blockMeta,
            lastIrreversibleBlockNumber: 1,
        };
        const result = noHashValidationActionHandler.handleBlock(nextBlock, false);
        yield expect(result).resolves.toBeNull();
    }));
    it('upgrades the action handler correctly', () => __awaiter(this, void 0, void 0, function* () {
        const blockMeta = {
            isRollback: false,
            isEarliestBlock: true,
            isNewBlock: true,
        };
        const nextBlock = {
            block: upgradeHandler[0],
            blockMeta,
            lastIrreversibleBlockNumber: 2,
        };
        const versionedActions = yield actionHandler._applyUpdaters({}, nextBlock, {}, false);
        yield actionHandler._runEffects(versionedActions, {}, nextBlock);
        expect(actionHandler._handlerVersionName).toEqual('v2');
        expect(runUpdater).toHaveBeenCalledTimes(1);
        expect(runEffect).toHaveBeenCalledTimes(2);
        expect(runUpgradeUpdater).toHaveBeenCalledTimes(1);
        expect(notRunUpdater).not.toHaveBeenCalled();
        expect(notRunUpdaterAfterUpgrade).not.toHaveBeenCalled();
        expect(runUpdaterAfterUpgrade).toHaveBeenCalledTimes(1);
        expect(notRunEffectAfterUpgrade).not.toHaveBeenCalled();
        expect(runEffectAfterUpgrade).toHaveBeenCalledTimes(1);
    }));
    it('defers the effects until the block is irreversible', () => __awaiter(this, void 0, void 0, function* () {
        const blockMeta = {
            isRollback: false,
            isEarliestBlock: true,
            isNewBlock: true,
        };
        const nextBlock = {
            block: upgradeHandler[0],
            blockMeta,
            lastIrreversibleBlockNumber: 1,
        };
        const versionedActions = yield actionHandler._applyUpdaters({}, nextBlock, {}, false);
        yield actionHandler._runEffects(versionedActions, {}, nextBlock);
        expect(runEffect).not.toHaveBeenCalled();
        expect(runEffectAfterUpgrade).not.toHaveBeenCalled();
        const blockMeta2 = {
            isRollback: false,
            isEarliestBlock: false,
            isNewBlock: true,
        };
        const nextBlock2 = {
            block: upgradeHandler[1],
            blockMeta: blockMeta2,
            lastIrreversibleBlockNumber: 2,
        };
        const versionedActions2 = yield actionHandler._applyUpdaters({}, nextBlock2, {}, false);
        yield actionHandler._runEffects(versionedActions2, {}, nextBlock2);
        expect(runEffect).toHaveBeenCalledTimes(2);
        expect(runEffectAfterUpgrade).toHaveBeenCalledTimes(1);
    }));
    it('rolls back', () => __awaiter(this, void 0, void 0, function* () {
        const blockMeta1 = {
            isRollback: false,
            isEarliestBlock: true,
            isNewBlock: true,
        };
        const nextBlock1 = {
            block: blockchain[0],
            blockMeta: blockMeta1,
            lastIrreversibleBlockNumber: 1,
        };
        yield actionHandler.handleBlock(nextBlock1, false);
        const blockMeta2 = {
            isRollback: false,
            isEarliestBlock: false,
            isNewBlock: true,
        };
        const nextBlock2 = {
            block: blockchain[1],
            blockMeta: blockMeta2,
            lastIrreversibleBlockNumber: 1,
        };
        yield actionHandler.handleBlock(nextBlock2, false);
        const blockMeta3 = {
            isRollback: false,
            isEarliestBlock: false,
            isNewBlock: true,
        };
        const nextBlock3 = {
            block: blockchain[2],
            blockMeta: blockMeta3,
            lastIrreversibleBlockNumber: 1,
        };
        yield actionHandler.handleBlock(nextBlock3, false);
        // Roll back
        const rollbackMeta = {
            isRollback: true,
            isEarliestBlock: false,
            isNewBlock: true,
        };
        const rollback2 = {
            block: blockchain[1],
            blockMeta: rollbackMeta,
            lastIrreversibleBlockNumber: 1,
        };
        yield actionHandler.handleBlock(rollback2, false);
        expect(actionHandler.info.lastProcessedBlockNumber).toEqual(2);
    }));
    it(`doesn't run effects from orphaned blocks`, () => __awaiter(this, void 0, void 0, function* () {
        const blockMeta1 = {
            isRollback: false,
            isEarliestBlock: true,
            isNewBlock: true,
        };
        const nextBlock1 = {
            block: blockchain[0],
            blockMeta: blockMeta1,
            lastIrreversibleBlockNumber: 1,
        };
        yield actionHandler.handleBlock(nextBlock1, false);
        const blockMeta2 = {
            isRollback: false,
            isEarliestBlock: false,
            isNewBlock: true,
        };
        const nextBlock2 = {
            block: blockchain[1],
            blockMeta: blockMeta2,
            lastIrreversibleBlockNumber: 1,
        };
        yield actionHandler.handleBlock(nextBlock2, false);
        const blockMeta3 = {
            isRollback: false,
            isEarliestBlock: false,
            isNewBlock: true,
        };
        const nextBlock3 = {
            block: blockchain[2],
            blockMeta: blockMeta3,
            lastIrreversibleBlockNumber: 1,
        };
        yield actionHandler.handleBlock(nextBlock3, false);
        const rollbackMeta = {
            isRollback: true,
            isEarliestBlock: false,
            isNewBlock: true,
        };
        const rollback2 = {
            block: blockchain[1],
            blockMeta: rollbackMeta,
            lastIrreversibleBlockNumber: 1,
        };
        yield actionHandler.handleBlock(rollback2, false);
        const incrementIrreversible3 = {
            block: upgradeHandler[1],
            blockMeta: blockMeta3,
            lastIrreversibleBlockNumber: 2,
        };
        yield actionHandler.handleBlock(incrementIrreversible3, false);
        expect(runEffect).toHaveBeenCalledTimes(2);
        expect(notRunEffect).not.toHaveBeenCalled();
    }));
    it('continues if initialization succeeds', () => __awaiter(this, void 0, void 0, function* () {
        actionHandler.state.indexState = {
            blockNumber: 3,
            blockHash: '000f42401b5636c3c1d88f31fe0e503654091fb822b0ffe21c7d35837fc9f3d8',
        };
        const blockMeta = {
            isRollback: false,
            isEarliestBlock: true,
            isNewBlock: true,
        };
        const nextBlock = {
            block: blockchain[0],
            blockMeta,
            lastIrreversibleBlockNumber: 1,
        };
        actionHandler.isInitialized = true;
        const seekBlockNum = yield actionHandler.handleBlock(nextBlock, false);
        expect(seekBlockNum).toBe(4);
    }));
    it('throws if iniatilization fails', () => __awaiter(this, void 0, void 0, function* () {
        actionHandler.state.indexState = {
            blockNumber: 3,
            blockHash: '000f42401b5636c3c1d88f31fe0e503654091fb822b0ffe21c7d35837fc9f3d8',
        };
        const blockMeta = {
            isRollback: false,
            isEarliestBlock: true,
            isNewBlock: true,
        };
        const nextBlock = {
            block: blockchain[0],
            blockMeta,
            lastIrreversibleBlockNumber: 1,
        };
        actionHandler.isInitialized = false;
        const result = actionHandler.handleBlock(nextBlock, false);
        yield expect(result).rejects.toThrow(errors_1.NotInitializedError);
    }));
    it(`doesn't run effect when effect mode is none`, () => __awaiter(this, void 0, void 0, function* () {
        const blockMeta = {
            isRollback: false,
            isEarliestBlock: true,
            isNewBlock: true,
        };
        const nextBlock = {
            block: blockchain[1],
            blockMeta,
            lastIrreversibleBlockNumber: 2,
        };
        const versionedActions = yield noEffectActionHandler._applyUpdaters({}, nextBlock, {}, false);
        yield noEffectActionHandler._runEffects(versionedActions, {}, nextBlock);
        expect(runEffect).not.toHaveBeenCalled();
    }));
    it(`runs effect when effect mode is OnlyDeferred`, () => __awaiter(this, void 0, void 0, function* () {
        const blockMeta = {
            isRollback: false,
            isEarliestBlock: true,
            isNewBlock: true,
        };
        const nextBlock = {
            block: blockchain[1],
            blockMeta,
            lastIrreversibleBlockNumber: 2,
        };
        const versionedActions = yield deferredEffectActionHandler._applyUpdaters({}, nextBlock, {}, false);
        yield deferredEffectActionHandler._runEffects(versionedActions, {}, nextBlock);
        expect(runEffect).toHaveBeenCalled();
    }));
    it(`doesn't run effect when effect mode is OnlyImmediate`, () => __awaiter(this, void 0, void 0, function* () {
        const blockMeta = {
            isRollback: false,
            isEarliestBlock: true,
            isNewBlock: true,
        };
        const nextBlock = {
            block: blockchain[1],
            blockMeta,
            lastIrreversibleBlockNumber: 2,
        };
        const versionedActions = yield immediateEffectActionHandler._applyUpdaters({}, nextBlock, {}, false);
        yield immediateEffectActionHandler._runEffects(versionedActions, {}, nextBlock);
        expect(runEffect).not.toHaveBeenCalled();
    }));
    it('keeps track of running effects', () => __awaiter(this, void 0, void 0, function* () {
        const blockMeta = {
            isRollback: false,
            isEarliestBlock: true,
            isNewBlock: true,
        };
        const nextBlock = {
            block: blockchain[0],
            blockMeta,
            lastIrreversibleBlockNumber: 2,
        };
        const versionedActions = yield actionHandler._applyUpdaters({}, nextBlock, {}, false);
        yield actionHandler._runEffects(versionedActions, {}, nextBlock);
        expect(startSlowEffect).toHaveBeenCalled();
        expect(finishSlowEffect).not.toHaveBeenCalled();
        expect(actionHandler.info.numberOfRunningEffects).toEqual(1);
        yield wait_1.wait(200);
        expect(finishSlowEffect).toHaveBeenCalled();
        expect(actionHandler.info.numberOfRunningEffects).toEqual(0);
    }));
    it('keeps track of thrown effects', () => __awaiter(this, void 0, void 0, function* () {
        const blockMeta = {
            isRollback: false,
            isEarliestBlock: true,
            isNewBlock: true,
        };
        const nextBlock = {
            block: blockchain[1],
            blockMeta,
            lastIrreversibleBlockNumber: 2,
        };
        const versionedActions = yield actionHandler._applyUpdaters({}, nextBlock, {}, false);
        yield actionHandler._runEffects(versionedActions, {}, nextBlock);
        expect(startThrownEffect).toHaveBeenCalled();
        expect(actionHandler.info.numberOfRunningEffects).toEqual(0);
        expect(actionHandler.info.effectErrors).toHaveLength(1);
        expect(actionHandler.info.effectErrors[0].startsWith('Error: Thrown effect')).toBeTruthy();
    }));
});
//# sourceMappingURL=AbstractActionHandler.test.js.map