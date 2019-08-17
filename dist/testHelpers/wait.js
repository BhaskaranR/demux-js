"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wait = (ms, mockCallback) => {
    if (mockCallback === undefined) {
        mockCallback = () => (undefined);
    }
    return new Promise((resolve) => {
        const callback = () => {
            mockCallback();
            resolve();
        };
        setTimeout(callback, ms);
    });
};
//# sourceMappingURL=wait.js.map