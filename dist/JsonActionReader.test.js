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
const JsonActionReader_1 = require("./JsonActionReader");
const blockchains_1 = __importDefault(require("./testHelpers/blockchains"));
const errors_1 = require("./errors");
describe('Action Reader', () => {
    let actionReader;
    let invalidActionReader;
    beforeEach(() => {
        actionReader = new JsonActionReader_1.JsonActionReader({ blockchain: blockchains_1.default.blockchain });
        invalidActionReader = new JsonActionReader_1.JsonActionReader({ blockchain: blockchains_1.default.upgradeHandler });
    });
    it('gets the head block number', () => __awaiter(this, void 0, void 0, function* () {
        const headBlockNumber = yield actionReader.getHeadBlockNumber();
        expect(headBlockNumber).toBe(4);
    }));
    it('gets the last irreversible block number', () => __awaiter(this, void 0, void 0, function* () {
        const libNumber = yield actionReader.getLastIrreversibleBlockNumber();
        expect(libNumber).toBe(4);
    }));
    it('gets block', () => __awaiter(this, void 0, void 0, function* () {
        const block = yield actionReader.getBlock(1);
        expect(block.blockInfo.blockNumber).toBe(1);
    }));
    it('throws due to bad block number at head', () => __awaiter(this, void 0, void 0, function* () {
        const headBlockNumberPromise = invalidActionReader.getHeadBlockNumber();
        yield expect(headBlockNumberPromise).rejects.toThrow(errors_1.JsonBlockIndicatesWrongPosition);
    }));
    it('throws because block number does not match its position', () => __awaiter(this, void 0, void 0, function* () {
        const blockPromise = invalidActionReader.getBlock(1);
        yield expect(blockPromise).rejects.toThrow(errors_1.JsonBlockIndicatesWrongPosition);
    }));
    it('throws because block does not exist', () => __awaiter(this, void 0, void 0, function* () {
        const blockPromise = invalidActionReader.getBlock(4);
        yield expect(blockPromise).rejects.toThrow(errors_1.JsonBlockDoesNotExist);
    }));
});
//# sourceMappingURL=JsonActionReader.test.js.map