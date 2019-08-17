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
const interfaces_1 = require("./interfaces");
const makeQueryablePromise_1 = require("./makeQueryablePromise");
/**
 * Takes `block`s output from implementations of `AbstractActionReader` and processes their actions through the
 * `Updater`s and `Effect`s of the current `HandlerVersion`. Pass an object exposing a persistence API as `state` to the
 * `handleWithState` method. Persist and retrieve information about the last block processed with `updateIndexState` and
 * `loadIndexState`. Implement `rollbackTo` to handle when a fork is encountered.
 *
 */
class AbstractActionHandler {
    /**
     * @param handlerVersions  An array of `HandlerVersion`s that are to be used when processing blocks. The default
     *                         version name is `"v1"`.
     *
     * @param options
     */
    constructor(handlerVersions, options) {
        this.lastProcessedBlockNumber = 0;
        this.lastProcessedBlockHash = '';
        this.lastIrreversibleBlockNumber = 0;
        this.handlerVersionName = 'v1';
        this.isReplay = false;
        this.initialized = false;
        this.deferredEffects = {};
        this.handlerVersionMap = {};
        this.runningEffects = [];
        this.effectErrors = [];
        const optionsWithDefaults = Object.assign({ effectRunMode: interfaces_1.EffectRunMode.All, logSource: 'AbstractActionHandler', logLevel: 'info', maxEffectErrors: 100, validateBlocks: true }, options);
        this.initHandlerVersions(handlerVersions);
        this.effectRunMode = optionsWithDefaults.effectRunMode;
        this.maxEffectErrors = optionsWithDefaults.maxEffectErrors;
        this.log = BunyanProvider_1.BunyanProvider.getLogger(optionsWithDefaults);
        this.validateBlocks = optionsWithDefaults.validateBlocks;
    }
    /**
     * Receive block, validate, and handle actions with updaters and effects
     */
    handleBlock(nextBlock, isReplay) {
        return __awaiter(this, void 0, void 0, function* () {
            const { block, blockMeta } = nextBlock;
            const { blockInfo } = block;
            const { isRollback, isEarliestBlock } = blockMeta;
            if (!this.initialized) {
                this.log.info('Action Handler was not initialized before started, so it is being initialized now');
                yield this.initialize();
            }
            yield this.handleRollback(isRollback, blockInfo.blockNumber, isReplay, isEarliestBlock);
            yield this.refreshIndexState();
            const nextBlockNeeded = this.lastProcessedBlockNumber + 1;
            // Just processed this block; skip
            if (blockInfo.blockNumber === this.lastProcessedBlockNumber
                && blockInfo.blockHash === this.lastProcessedBlockHash) {
                this.log.debug(`Block ${blockInfo.blockNumber} was just handled; skipping`);
                return null;
            }
            // If it's the first block but we've already processed blocks, seek to next block
            if (isEarliestBlock && this.lastProcessedBlockHash) {
                return nextBlockNeeded;
            }
            // Only check if this is the block we need if it's not the first block
            if (!isEarliestBlock) {
                if (blockInfo.blockNumber !== nextBlockNeeded) {
                    this.log.debug(`Got block ${blockInfo.blockNumber} but block ${nextBlockNeeded} is needed; ` +
                        `requesting block ${nextBlockNeeded}`);
                    return nextBlockNeeded;
                }
                // Block sequence consistency should be handled by the ActionReader instance
                if (blockInfo.previousBlockHash !== this.lastProcessedBlockHash && this.validateBlocks) {
                    throw new errors_1.MismatchedBlockHashError(blockInfo.blockNumber, this.lastProcessedBlockHash, blockInfo.previousBlockHash);
                }
            }
            const handleWithArgs = (state, context = {}) => __awaiter(this, void 0, void 0, function* () {
                yield this.handleActions(state, context, nextBlock, isReplay);
            });
            yield this.handleWithState(handleWithArgs);
            return null;
        });
    }
    /**
     * Information about the current state of the Action Handler
     */
    get info() {
        const effectInfo = this.checkRunningEffects();
        return {
            lastProcessedBlockNumber: this.lastProcessedBlockNumber,
            lastProcessedBlockHash: this.lastProcessedBlockHash,
            lastIrreversibleBlockNumber: this.lastIrreversibleBlockNumber,
            handlerVersionName: this.handlerVersionName,
            isReplay: this.isReplay,
            effectRunMode: this.effectRunMode,
            numberOfRunningEffects: effectInfo.numberOfRunningEffects,
            effectErrors: effectInfo.effectErrors,
        };
    }
    /**
     * Performs all required initialization for the handler.
     */
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.debug('Initializing Action Handler...');
            const setupStart = Date.now();
            yield this.setup();
            const betweenSetupAndIndexState = Date.now();
            yield this.refreshIndexState();
            this.initialized = true;
            const setupTime = betweenSetupAndIndexState - setupStart;
            const indexStateTime = Date.now() - betweenSetupAndIndexState;
            const initializeTime = setupTime + indexStateTime;
            this.log.debug(`Initialized Action Handler (${setupTime}ms setup + ${indexStateTime}ms index state = ${initializeTime}ms)`);
        });
    }
    /**
     * This method is used when matching the types of incoming actions against the types the `Updater`s and `Effect`s are
     * subscribed to. When this returns true, their corresponding functions will run.
     *
     * By default, this method tests for direct equivalence between the incoming candidate type and the type that is
     * subscribed. Override this method to extend this functionality (e.g. wildcards).
     *
     * @param candidateType   The incoming action's type
     * @param subscribedType  The type the Updater of Effect is subscribed to
     * @param _payload        The payload of the incoming Action.
     */
    matchActionType(candidateType, subscribedType, _payload) {
        return candidateType === subscribedType;
    }
    /**
     * Process actions against deterministically accumulating `Updater` functions. Returns a promise of versioned actions
     * for consumption by `runEffects`, to make sure the correct effects are run on blocks that include a `HandlerVersion`
     * change. To change a `HandlerVersion`, have an `Updater` function return the `versionName` of the corresponding
     * `HandlerVersion` you want to change to.
     */
    applyUpdaters(state, nextBlock, context, isReplay) {
        return __awaiter(this, void 0, void 0, function* () {
            const versionedActions = [];
            const { block: { actions, blockInfo } } = nextBlock;
            for (const action of actions) {
                let updaterIndex = -1;
                for (const updater of this.handlerVersionMap[this.handlerVersionName].updaters) {
                    updaterIndex += 1;
                    if (this.matchActionType(action.type, updater.actionType, action.payload)) {
                        const { payload } = action;
                        this.log.debug(`Applying updater for action type '${action.type}'...`);
                        const updaterStart = Date.now();
                        const newVersion = yield updater.apply(state, payload, blockInfo, context);
                        const updaterTime = Date.now() - updaterStart;
                        this.log.debug(`Applied updater for action type '${action.type}' (${updaterTime}ms)`);
                        if (newVersion && !this.handlerVersionMap.hasOwnProperty(newVersion)) {
                            this.warnHandlerVersionNonexistent(newVersion);
                        }
                        else if (newVersion) {
                            this.log.info(`Updated Handler Version to '${newVersion}' (block ${blockInfo.blockNumber})`);
                            this.warnSkippingUpdaters(updaterIndex, action.type);
                            yield this.loggedUpdateIndexState(state, nextBlock, isReplay, newVersion, context);
                            this.handlerVersionName = newVersion;
                            break;
                        }
                    }
                }
                versionedActions.push({
                    action,
                    handlerVersionName: this.handlerVersionName,
                });
            }
            return versionedActions;
        });
    }
    /**
     * Process versioned actions against asynchronous side effects.
     */
    runEffects(versionedActions, context, nextBlock) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runDeferredEffects(nextBlock.lastIrreversibleBlockNumber);
            for (const { action, handlerVersionName } of versionedActions) {
                for (const effect of this.handlerVersionMap[handlerVersionName].effects) {
                    if (this.shouldRunOrDeferEffect(effect, action)) {
                        yield this.runOrDeferEffect(effect, action.payload, nextBlock, context);
                    }
                }
            }
        });
    }
    /**
     * Calls `applyUpdaters` and `runEffects` on the given actions
     */
    handleActions(state, context, nextBlock, isReplay) {
        return __awaiter(this, void 0, void 0, function* () {
            const { block } = nextBlock;
            const { blockInfo } = block;
            const versionedActions = yield this.applyUpdaters(state, nextBlock, context, isReplay);
            if (!isReplay) {
                yield this.runEffects(versionedActions, context, nextBlock);
            }
            yield this.loggedUpdateIndexState(state, nextBlock, isReplay, this.handlerVersionName, context);
            this.lastProcessedBlockNumber = blockInfo.blockNumber;
            this.lastProcessedBlockHash = blockInfo.blockHash;
            this.checkRunningEffects();
        });
    }
    handleRollback(isRollback, blockNumber, isReplay, isEarliestBlock) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isRollback || (isReplay && isEarliestBlock)) {
                const rollbackBlockNumber = blockNumber - 1;
                const rollbackCount = this.lastProcessedBlockNumber - rollbackBlockNumber;
                this.log.debug(`Rolling back ${rollbackCount} blocks to block ${rollbackBlockNumber}...`);
                const rollbackStart = Date.now();
                yield this.rollbackTo(rollbackBlockNumber);
                this.rollbackDeferredEffects(blockNumber);
                const rollbackTime = Date.now() - rollbackStart;
                this.log.info(`Rolled back ${rollbackCount} blocks to block ${rollbackBlockNumber} (${rollbackTime}ms)`);
            }
        });
    }
    range(start, end) {
        return Array(end - start).fill(0).map((_, i) => i + start);
    }
    runOrDeferEffect(effect, payload, nextBlock, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { block, lastIrreversibleBlockNumber } = nextBlock;
            const { blockInfo } = block;
            const queueTime = Date.now();
            const curriedEffectRun = this.curryEffectRun(effect, payload, blockInfo, context, queueTime);
            const shouldRunImmediately = (!effect.deferUntilIrreversible || blockInfo.blockNumber <= lastIrreversibleBlockNumber);
            if (shouldRunImmediately) {
                this.runningEffects.push(makeQueryablePromise_1.makeQuerablePromise(curriedEffectRun(blockInfo.blockNumber, true), false));
            }
            else {
                if (!this.deferredEffects[blockInfo.blockNumber]) {
                    this.deferredEffects[blockInfo.blockNumber] = [];
                }
                this.log.debug(`Deferring effect for '${effect.actionType}' until block ${blockInfo.blockNumber} becomes irreversible`);
                this.deferredEffects[blockInfo.blockNumber].push(curriedEffectRun);
            }
        });
    }
    shouldRunOrDeferEffect(effect, action) {
        if (!this.matchActionType(action.type, effect.actionType, action.payload)) {
            return false;
        }
        else if (this.effectRunMode === interfaces_1.EffectRunMode.None) {
            return false;
        }
        else if (this.effectRunMode === interfaces_1.EffectRunMode.OnlyImmediate && effect.deferUntilIrreversible) {
            return false;
        }
        else if (this.effectRunMode === interfaces_1.EffectRunMode.OnlyDeferred && !effect.deferUntilIrreversible) {
            return false;
        }
        return true;
    }
    curryEffectRun(effect, payload, blockInfo, context, queueTime) {
        return (currentBlockNumber, immediate = false) => __awaiter(this, void 0, void 0, function* () {
            const effectStart = Date.now();
            const waitedBlocks = currentBlockNumber - blockInfo.blockNumber;
            const waitedTime = effectStart - queueTime;
            this.log.debug(`Running ${immediate ? '' : 'deferred '}effect for '${effect.actionType}'...` +
                (immediate ? '' : ` (waited ${waitedBlocks} blocks; ${waitedTime}ms)`));
            yield effect.run(payload, blockInfo, context);
            const effectTime = Date.now() - effectStart;
            this.log.debug(`Ran ${immediate ? '' : 'deferred '}effect for '${effect.actionType}' (${effectTime}ms)`);
        });
    }
    runDeferredEffects(lastIrreversibleBlockNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const nextDeferredBlockNumber = this.getNextDeferredBlockNumber();
            if (!nextDeferredBlockNumber) {
                return;
            }
            for (const blockNumber of this.range(nextDeferredBlockNumber, lastIrreversibleBlockNumber + 1)) {
                if (this.deferredEffects[blockNumber]) {
                    const effects = this.deferredEffects[blockNumber];
                    this.log.debug(`Block ${blockNumber} is now irreversible, running ${effects.length} deferred effects`);
                    for (const deferredEffectRun of effects) {
                        this.runningEffects.push(makeQueryablePromise_1.makeQuerablePromise(deferredEffectRun(blockNumber), false));
                    }
                    delete this.deferredEffects[blockNumber];
                }
            }
        });
    }
    getNextDeferredBlockNumber() {
        const blockNumbers = Object.keys(this.deferredEffects).map((num) => parseInt(num, 10));
        if (blockNumbers.length === 0) {
            return 0;
        }
        return Math.min(...blockNumbers);
    }
    checkRunningEffects() {
        const newEffectErrors = this.runningEffects
            .filter((effectPromise) => {
            return effectPromise.isRejected();
        })
            .map((rejectedPromise) => {
            const error = rejectedPromise.error();
            if (error && error.stack) {
                return error.stack;
            }
            return '(stack trace not captured)';
        });
        this.effectErrors.push(...newEffectErrors);
        this.effectErrors.splice(0, this.effectErrors.length - this.maxEffectErrors);
        this.runningEffects = this.runningEffects.filter((effectPromise) => effectPromise.isPending());
        return {
            numberOfRunningEffects: this.runningEffects.length,
            effectErrors: this.effectErrors,
        };
    }
    rollbackDeferredEffects(rollbackTo) {
        const blockNumbers = Object.keys(this.deferredEffects).map((num) => parseInt(num, 10));
        const toRollBack = blockNumbers.filter((bn) => bn >= rollbackTo);
        for (const blockNumber of toRollBack) {
            this.log.debug(`Removing ${this.deferredEffects[blockNumber].length} deferred effects for rolled back block ${blockNumber}`);
            delete this.deferredEffects[blockNumber];
        }
    }
    initHandlerVersions(handlerVersions) {
        if (handlerVersions.length === 0) {
            throw new errors_1.MissingHandlerVersionError();
        }
        for (const handlerVersion of handlerVersions) {
            if (this.handlerVersionMap.hasOwnProperty(handlerVersion.versionName)) {
                throw new errors_1.DuplicateHandlerVersionError(handlerVersion.versionName);
            }
            this.handlerVersionMap[handlerVersion.versionName] = handlerVersion;
        }
        if (!this.handlerVersionMap.hasOwnProperty(this.handlerVersionName)) {
            this.handlerVersionName = handlerVersions[0].versionName;
            this.warnMissingHandlerVersion(handlerVersions[0].versionName);
        }
        else if (handlerVersions[0].versionName !== 'v1') {
            this.warnIncorrectFirstHandler(handlerVersions[0].versionName);
        }
    }
    loggedUpdateIndexState(state, nextBlock, isReplay, handlerVersionName, context) {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.debug('Updating Index State...');
            const updateStart = Date.now();
            yield this.updateIndexState(state, nextBlock, isReplay, handlerVersionName, context);
            const updateTime = Date.now() - updateStart;
            this.log.debug(`Updated Index State (${updateTime}ms)`);
        });
    }
    refreshIndexState() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.debug('Loading Index State...');
            const refreshStart = Date.now();
            const indexState = yield this.loadIndexState();
            this.lastProcessedBlockNumber = indexState.blockNumber;
            this.lastProcessedBlockHash = indexState.blockHash;
            this.lastIrreversibleBlockNumber = indexState.lastIrreversibleBlockNumber;
            this.handlerVersionName = indexState.handlerVersionName;
            this.isReplay = indexState.isReplay;
            const refreshTime = Date.now() - refreshStart;
            this.log.debug(`Loaded Index State (${refreshTime}ms)`);
        });
    }
    warnMissingHandlerVersion(actualVersion) {
        this.log.warn(`No Handler Version found with name '${this.handlerVersionName}': starting with ` +
            `'${actualVersion}' instead.`);
    }
    warnIncorrectFirstHandler(actualVersion) {
        this.log.warn(`First Handler Version '${actualVersion}' is not '${this.handlerVersionName}', ` +
            `and there is also '${this.handlerVersionName}' present. Handler Version ` +
            `'${this.handlerVersionName}' will be used, even though it is not first.`);
    }
    warnHandlerVersionNonexistent(newVersion) {
        this.log.warn(`Attempted to switch to handler version '${newVersion}', however this version ` +
            `does not exist. Handler will continue as version '${this.handlerVersionName}'`);
    }
    warnSkippingUpdaters(updaterIndex, actionType) {
        const remainingUpdaters = this.handlerVersionMap[this.handlerVersionName].updaters.length - updaterIndex - 1;
        if (remainingUpdaters) {
            this.log.warn(`Handler Version was updated to version '${this.handlerVersionName}' while there ` +
                `were still ${remainingUpdaters} updaters left! These updaters will be skipped for the ` +
                `current action '${actionType}'.`);
        }
    }
}
exports.AbstractActionHandler = AbstractActionHandler;
//# sourceMappingURL=AbstractActionHandler.js.map