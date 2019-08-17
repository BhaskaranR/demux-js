"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeQuerablePromise = (promise, throwOnError = true) => {
    let isPending = true;
    let isRejected = false;
    let isFulfilled = false;
    let value = null;
    let error = null;
    const result = promise.then((fulfilledValue) => {
        isFulfilled = true;
        isPending = false;
        value = fulfilledValue;
        return fulfilledValue;
    }, (err) => {
        isRejected = true;
        isPending = false;
        error = err;
        if (throwOnError) {
            throw err;
        }
    });
    result.isFulfilled = () => isFulfilled;
    result.isPending = () => isPending;
    result.isRejected = () => isRejected;
    result.value = () => value;
    result.error = () => error;
    return result;
};
//# sourceMappingURL=makeQueryablePromise.js.map