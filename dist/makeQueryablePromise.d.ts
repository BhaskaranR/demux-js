export interface QueryablePromise<T> extends Promise<T> {
    isFulfilled(): boolean;
    isPending(): boolean;
    isRejected(): boolean;
    value(): any;
    error(): Error | null;
}
export declare const makeQuerablePromise: <T>(promise: Promise<T>, throwOnError?: boolean) => QueryablePromise<T>;
