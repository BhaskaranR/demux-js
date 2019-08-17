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
const AbstractActionHandler_1 = require("../AbstractActionHandler");
const errors_1 = require("../errors");
class TestActionHandler extends AbstractActionHandler_1.AbstractActionHandler {
    constructor() {
        super(...arguments);
        this.isInitialized = false;
        this.indexState = {
            blockNumber: 0,
            blockHash: '',
            isReplay: false,
            handlerVersionName: 'v1',
            lastIrreversibleBlockNumber: 0
        };
        this.state = { indexState: this.indexState };
        this.hashHistory = { 0: '' };
    }
    get _handlerVersionName() { return this.handlerVersionName; }
    // tslint:disable-next-line
    handleWithState(handle) {
        return __awaiter(this, void 0, void 0, function* () {
            yield handle(this.state);
        });
    }
    rollbackTo(blockNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            this.setLastProcessedBlockNumber(blockNumber);
            this.setLastProcessedBlockHash(this.hashHistory[blockNumber]);
            this.state.indexState = Object.assign({}, this.state.indexState, { blockNumber, blockHash: this.hashHistory[blockNumber] });
        });
    }
    setLastProcessedBlockHash(hash) {
        this.lastProcessedBlockHash = hash;
        this.indexState.blockHash = hash;
    }
    setLastProcessedBlockNumber(num) {
        this.lastProcessedBlockNumber = num;
        this.indexState.blockNumber = num;
    }
    _applyUpdaters(state, nextBlock, context, isReplay) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.applyUpdaters(state, nextBlock, context, isReplay);
        });
    }
    _runEffects(versionedActions, context, nextBlock) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runEffects(versionedActions, context, nextBlock);
        });
    }
    loadIndexState() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.state.indexState;
        });
    }
    handleBlock(nextBlock, isReplay) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            const { blockNumber, blockHash } = nextBlock.block.blockInfo;
            this.hashHistory[blockNumber] = blockHash;
            return _super("handleBlock").call(this, nextBlock, isReplay);
        });
    }
    updateIndexState(state, nextBlock, isReplay, handlerVersionName) {
        return __awaiter(this, void 0, void 0, function* () {
            const { blockNumber, blockHash } = nextBlock.block.blockInfo;
            state.indexState = { blockNumber, blockHash, isReplay, handlerVersionName };
        });
    }
    setup() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isInitialized) {
                throw new errors_1.NotInitializedError();
            }
        });
    }
}
exports.TestActionHandler = TestActionHandler;
//# sourceMappingURL=TestActionHandler.js.map