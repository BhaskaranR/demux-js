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
const AbstractActionReader_1 = require("../AbstractActionReader");
const errors_1 = require("../errors");
class TestActionReader extends AbstractActionReader_1.AbstractActionReader {
    constructor() {
        super(...arguments);
        this.isInitialized = false;
        this.blockchain = [];
        // tslint:disable-next-line:variable-name
        this._testLastIrreversible = 0;
    }
    get _blockHistory() {
        return this.blockHistory;
    }
    get _lastIrreversibleBlockNumber() {
        return this.lastIrreversibleBlockNumber;
    }
    getHeadBlockNumber() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.blockchain[this.blockchain.length - 1].blockInfo.blockNumber;
        });
    }
    getLastIrreversibleBlockNumber() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._testLastIrreversible) {
                return this._testLastIrreversible;
            }
            return this.getHeadBlockNumber();
        });
    }
    getBlock(blockNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.blockchain[blockNumber - 1];
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
exports.TestActionReader = TestActionReader;
//# sourceMappingURL=TestActionReader.js.map