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
const AbstractActionReader_1 = require("./AbstractActionReader");
const errors_1 = require("./errors");
/**
 * Reads from an array of `Block` objects, useful for testing.
 */
class JsonActionReader extends AbstractActionReader_1.AbstractActionReader {
    constructor(options) {
        super(options);
        this.blockchain = options.blockchain;
    }
    setup() {
        return __awaiter(this, void 0, void 0, function* () { return; });
    }
    getHeadBlockNumber() {
        return __awaiter(this, void 0, void 0, function* () {
            const block = this.blockchain.slice(-1)[0];
            const { blockInfo: { blockNumber } } = block;
            if (this.blockchain.length !== blockNumber) {
                throw new errors_1.JsonBlockIndicatesWrongPosition(blockNumber, this.blockchain.length);
            }
            return blockNumber;
        });
    }
    getLastIrreversibleBlockNumber() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getHeadBlockNumber();
        });
    }
    getBlock(blockNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const block = this.blockchain[blockNumber - 1];
            if (!block) {
                throw new errors_1.JsonBlockDoesNotExist(blockNumber);
            }
            if (block.blockInfo.blockNumber !== blockNumber) {
                throw new errors_1.JsonBlockIndicatesWrongPosition(blockNumber, this.blockchain.length);
            }
            return block;
        });
    }
}
exports.JsonActionReader = JsonActionReader;
//# sourceMappingURL=JsonActionReader.js.map