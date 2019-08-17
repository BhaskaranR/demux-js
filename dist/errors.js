"use strict";
// tslint:disable:max-classes-per-file
// Disabling tslint's max classes rule here because it would add a lot of unnecessary separation for simple classes.
Object.defineProperty(exports, "__esModule", { value: true });
class MismatchedBlockHashError extends Error {
    constructor(currentBlock, expectedHash, actualHash) {
        super(`Block hashes do not match; block not part of current chain.`
            + ` Current block: ${currentBlock} Expected: ${expectedHash} Found: ${actualHash}`);
        Object.setPrototypeOf(this, MismatchedBlockHashError.prototype);
    }
}
exports.MismatchedBlockHashError = MismatchedBlockHashError;
class MissingHandlerVersionError extends Error {
    constructor() {
        super('Must have at least one handler version.');
        Object.setPrototypeOf(this, MissingHandlerVersionError.prototype);
    }
}
exports.MissingHandlerVersionError = MissingHandlerVersionError;
class DuplicateHandlerVersionError extends Error {
    constructor(versionName) {
        super(`Handler version name '${versionName}' already exists. ` +
            'Handler versions must have unique names.');
        Object.setPrototypeOf(this, DuplicateHandlerVersionError.prototype);
    }
}
exports.DuplicateHandlerVersionError = DuplicateHandlerVersionError;
class ImproperStartAtBlockError extends Error {
    constructor(blockNumber, startAtBlock) {
        super(`Cannot seek to block number ${blockNumber} before configured \`startAtBlock\` number ${startAtBlock}. `);
        Object.setPrototypeOf(this, ImproperStartAtBlockError.prototype);
    }
}
exports.ImproperStartAtBlockError = ImproperStartAtBlockError;
class ImproperSeekToBlockError extends Error {
    constructor(blockNumber) {
        super(`Cannot seek to block number ${blockNumber} as it does not exist yet.`);
        Object.setPrototypeOf(this, ImproperSeekToBlockError.prototype);
    }
}
exports.ImproperSeekToBlockError = ImproperSeekToBlockError;
class ReloadHistoryError extends Error {
    constructor() {
        super('Could not reload history.');
        Object.setPrototypeOf(this, ReloadHistoryError.prototype);
    }
}
exports.ReloadHistoryError = ReloadHistoryError;
class UnresolvedForkError extends Error {
    constructor() {
        super('Last irreversible block has been passed without resolving fork');
        Object.setPrototypeOf(this, UnresolvedForkError.prototype);
    }
}
exports.UnresolvedForkError = UnresolvedForkError;
// Adapted from https://stackoverflow.com/a/42755876
class RethrownError extends Error {
    constructor(message, error) {
        super(message);
        this.name = this.constructor.name;
        this.message = message;
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        }
        else {
            this.stack = (new Error(message)).stack;
        }
        if (error) {
            this.extendStack(error);
        }
        Object.setPrototypeOf(this, RethrownError.prototype);
    }
    extendStack(error) {
        const messageLines = (this.message.match(/\n/g) || []).length + 1;
        if (this.stack) {
            this.stack = this.stack.split('\n').slice(0, messageLines + 1).join('\n') + '\n' + error.stack;
        }
    }
}
class NotInitializedError extends RethrownError {
    constructor(message, error) {
        super(`The proper initialization has not occurred. ${message}`, error);
        Object.setPrototypeOf(this, NotInitializedError.prototype);
    }
}
exports.NotInitializedError = NotInitializedError;
class JsonBlockIndicatesWrongPosition extends Error {
    constructor(blockNumber, position) {
        super(`Block with indicated position ${blockNumber} has actual position of ${position}.`);
        Object.setPrototypeOf(this, JsonBlockIndicatesWrongPosition.prototype);
    }
}
exports.JsonBlockIndicatesWrongPosition = JsonBlockIndicatesWrongPosition;
class JsonBlockDoesNotExist extends Error {
    constructor(blockNumber) {
        super(`Block at position ${blockNumber} does not exist.`);
        Object.setPrototypeOf(this, JsonBlockDoesNotExist.prototype);
    }
}
exports.JsonBlockDoesNotExist = JsonBlockDoesNotExist;
//# sourceMappingURL=errors.js.map